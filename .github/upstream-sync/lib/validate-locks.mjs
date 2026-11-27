import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { matchesAny } from "./policy.mjs";
import { COMMIT_SHA_RE } from "./snapshot.mjs";
import { destinationPrefix as emilDestinationPrefix, runtimeSkillName, upstreamSkillName } from "../../emil-skills-sync/lib.mjs";

function validateLockHeader(lock, { label, expectedRepository, repoMismatchMessage, errors }) {
  if (lock.repository !== expectedRepository) {
    errors.push(repoMismatchMessage);
  }
  if (!COMMIT_SHA_RE.test(lock.commit ?? "")) {
    errors.push(`${label} lock commit must be a full lowercase commit SHA`);
  }
}

function validateSortedLockFiles(lock, {
  label,
  actualFiles,
  inventoryMismatchMessage,
  errors,
  isAllowedFile,
  outOfScopeMessage,
}) {
  if (!Array.isArray(lock.files) || lock.files.some((file) => typeof file !== "string")) {
    errors.push(`${label} lock files must be an array of paths`);
    return false;
  }
  const sortedUnique = [...new Set(lock.files)].sort();
  if (JSON.stringify(lock.files) !== JSON.stringify(sortedUnique)) {
    errors.push(`${label} lock files must be sorted and unique`);
  }
  if (JSON.stringify(sortedUnique) !== JSON.stringify(actualFiles)) {
    errors.push(inventoryMismatchMessage);
  }
  if (isAllowedFile) {
    for (const file of lock.files) {
      if (!isAllowedFile(file)) {
        errors.push(outOfScopeMessage(file));
      }
    }
  }
  return true;
}

function validateSingleSkillLock({
  repoRoot,
  source,
  label,
  repoMismatchMessage,
  inventoryMismatchMessage,
  destinationPrefix,
  upstreamSkillPrefix,
  repositoryFiles,
  errors,
}) {
  try {
    const lock = JSON.parse(readFileSync(path.join(repoRoot, ...source.lock.split("/")), "utf8"));
    validateLockHeader(lock, {
      label,
      expectedRepository: source.repository,
      repoMismatchMessage,
      errors,
    });
    const actualFiles = repositoryFiles
      .filter((file) => file.startsWith(destinationPrefix))
      .map((file) => {
        const relative = file.slice(destinationPrefix.length);
        return relative === "LICENSE" ? "LICENSE" : `${upstreamSkillPrefix}${relative}`;
      })
      .sort();
    validateSortedLockFiles(lock, {
      label,
      actualFiles,
      inventoryMismatchMessage,
      errors,
      isAllowedFile: (file) => file === "LICENSE" || file.startsWith(upstreamSkillPrefix),
      outOfScopeMessage: (file) => `${label} lock contains an out-of-scope file: ${file}`,
    });
  } catch (error) {
    errors.push(`Invalid ${label.toLowerCase()} lock: ${error.message}`);
  }
}

export function validateLocks(repoRoot, policy, sources, repositoryFiles, runtimeNames, errors) {
  try {
    const lock = JSON.parse(readFileSync(path.join(repoRoot, ...sources.upstream.lock.split("/")), "utf8"));
    validateLockHeader(lock, {
      label: "Upstream",
      expectedRepository: policy.upstream,
      repoMismatchMessage: "Upstream lock repository does not match policy",
      errors,
    });
    if (typeof policy.upstreamLicensePath !== "string" || !policy.upstreamLicensePath.trim()) {
      errors.push("Upstream policy must define upstreamLicensePath");
    }
    const isManagedUpstream = (file) => file === policy.upstreamLicensePath || matchesAny(file, policy.upstreamAllowlist);
    const actualFiles = repositoryFiles.filter(
      (file) => isManagedUpstream(file) && !matchesAny(file, policy.projectOwned),
    );
    if (validateSortedLockFiles(lock, {
      label: "Upstream",
      actualFiles,
      inventoryMismatchMessage: "Upstream lock inventory does not match the composed upstream files",
      errors,
    })) {
      if (typeof policy.upstreamLicensePath === "string" && policy.upstreamLicensePath.trim() &&
          !lock.files.includes(policy.upstreamLicensePath)) {
        errors.push(`Upstream lock must include ${policy.upstreamLicensePath}`);
      }
      for (const file of lock.files) {
        if (!isManagedUpstream(file)) errors.push(`Upstream lock contains a non-allowlisted file: ${file}`);
        if (matchesAny(file, policy.blockedUpstreamPaths) || matchesAny(file, policy.projectOwned)) {
          errors.push(`Upstream lock contains a project-owned collision: ${file}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Invalid upstream lock: ${error.message}`);
  }

  validateSingleSkillLock({
    repoRoot,
    source: sources["security-audit"],
    label: "Security-audit",
    repoMismatchMessage: "Security-audit lock repository does not match Cloudflare upstream",
    inventoryMismatchMessage: "Security-audit lock inventory does not match the installed Cloudflare files",
    destinationPrefix: "skills/security/security-audit/",
    upstreamSkillPrefix: "skills/security-audit/",
    repositoryFiles,
    errors,
  });

  validateSingleSkillLock({
    repoRoot,
    source: sources["i-have-adhd"],
    label: "i-have-adhd",
    repoMismatchMessage: "i-have-adhd lock repository does not match upstream",
    inventoryMismatchMessage: "i-have-adhd lock inventory does not match the installed files",
    destinationPrefix: "skills/productivity/i-have-adhd/",
    upstreamSkillPrefix: "skills/i-have-adhd/",
    repositoryFiles,
    errors,
  });

  try {
    const emilSource = sources["emil-skills"];
    const lock = JSON.parse(readFileSync(path.join(repoRoot, ...emilSource.lock.split("/")), "utf8"));
    validateLockHeader(lock, {
      label: "Emil",
      expectedRepository: emilSource.repository,
      repoMismatchMessage: "Emil lock repository does not match upstream",
      errors,
    });
    const actualFiles = [...new Set(repositoryFiles
      .filter((file) => file.startsWith(emilDestinationPrefix) && file !== `${emilDestinationPrefix}README.md`)
      .map((file) => {
        const [name, ...segments] = file.slice(emilDestinationPrefix.length).split("/");
        const relative = segments.join("/");
        return relative === "LICENSE" ? "LICENSE" : `skills/${upstreamSkillName(name)}/${relative}`;
      }))].sort();
    if (validateSortedLockFiles(lock, {
      label: "Emil",
      actualFiles,
      inventoryMismatchMessage: "Emil lock inventory does not match the installed files",
      errors,
      isAllowedFile: (file) => file === "LICENSE" || /^skills\/[a-z0-9]+(?:-[a-z0-9]+)*\/.+/.test(file),
      outOfScopeMessage: (file) => `Emil lock contains an out-of-scope file: ${file}`,
    })) {
      const sourceSkills = lock.files.filter((file) => /^skills\/[^/]+\/SKILL\.md$/.test(file));
      if (!sourceSkills.length || !lock.files.includes("LICENSE")) {
        errors.push("Emil lock must include skills and the upstream license");
      }
      for (const file of sourceSkills) {
        const name = runtimeSkillName(file.split("/")[1]);
        const localRoot = `${emilDestinationPrefix}${name}/`;
        if (runtimeNames.get(name) !== `${localRoot}SKILL.md`) errors.push(`Emil runtime skill is missing or moved: ${name}`);
        if (!existsSync(path.join(repoRoot, localRoot, "LICENSE"))) errors.push(`Emil runtime skill license is missing: ${name}`);
      }
    }
  } catch (error) {
    errors.push(`Invalid Emil lock: ${error.message}`);
  }

  try {
    const taiwanSource = sources["taiwan-terminology"];
    const taiwanTerminologyRoot = path.join(repoRoot, "skills", "language", "taiwan-term");
    const lock = JSON.parse(readFileSync(path.join(repoRoot, ...taiwanSource.lock.split("/")), "utf8"));
    const metadata = JSON.parse(
      readFileSync(path.join(taiwanTerminologyRoot, "references", "taiwan-md", "UPSTREAM.json"), "utf8"),
    );
    const snapshotBytes = readFileSync(
      path.join(taiwanTerminologyRoot, "references", "taiwan-md", "terminology.snapshot.json"),
    );
    const snapshot = JSON.parse(snapshotBytes.toString("utf8"));
    const expectedSourcePaths = ["README.md", "data/terminology/*.yaml"];
    if (lock.repository !== taiwanSource.repository || metadata.repository !== taiwanSource.repository) {
      errors.push("Taiwan terminology source repository does not match Taiwan.md upstream");
    }
    if (!COMMIT_SHA_RE.test(lock.commit ?? "") || lock.commit !== metadata.commit) {
      errors.push("Taiwan terminology lock and runtime metadata must share a full commit SHA");
    }
    if (JSON.stringify(lock.source_paths) !== JSON.stringify(expectedSourcePaths) ||
        JSON.stringify(metadata.source_paths) !== JSON.stringify(expectedSourcePaths)) {
      errors.push("Taiwan terminology source paths do not match the synchronization contract");
    }
    if (lock.snapshot !== "terminology.snapshot.json" || metadata.snapshot !== lock.snapshot) {
      errors.push("Taiwan terminology snapshot filename does not match the synchronization contract");
    }
    const digest = createHash("sha256").update(snapshotBytes).digest("hex");
    if (lock.snapshot_sha256 !== digest || metadata.snapshot_sha256 !== digest) {
      errors.push("Taiwan terminology snapshot digest does not match its lock metadata");
    }
    if (snapshot.schema_version !== 1 || snapshot.source?.repository !== taiwanSource.repository ||
        snapshot.source?.commit !== lock.commit || !Array.isArray(snapshot.terms)) {
      errors.push("Taiwan terminology snapshot schema or source metadata is invalid");
    } else {
      const severityA = snapshot.terms.filter((term) => term.detection?.severity === "A").length;
      const severityB = snapshot.terms.filter((term) => term.detection?.severity === "B").length;
      if (snapshot.terms.length !== lock.terms || snapshot.terms.length !== metadata.terms ||
          severityA !== lock.severity_a || severityA !== metadata.severity_a ||
          severityB !== lock.severity_b || severityB !== metadata.severity_b ||
          snapshot.statistics?.terms !== lock.terms ||
          snapshot.statistics?.severity_a !== lock.severity_a ||
          snapshot.statistics?.severity_b !== lock.severity_b) {
        errors.push("Taiwan terminology snapshot statistics do not match its lock metadata");
      }
    }
  } catch (error) {
    errors.push(`Invalid Taiwan terminology snapshot: ${error.message}`);
  }
}

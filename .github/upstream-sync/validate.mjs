#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isExcludedUpstreamPath, loadPolicy, matchesAny } from "./lib/policy.mjs";
import { destinationPrefix as emilDestinationPrefix, runtimeSkillName, upstreamSkillName, upstreamRepository as emilRepository } from "../emil-skills-sync/lib.mjs";

const repoRoot = path.resolve(
  process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
);
const errors = [];
const controlPlaneRoot = path.join(repoRoot, ".github", "upstream-sync");
const securityAuditControlPlaneRoot = path.join(repoRoot, ".github", "security-audit-sync");
const securityAuditRepository = "https://github.com/cloudflare/security-audit-skill";
const securityAuditDestinationPrefix = "skills/security/security-audit/";
const iHaveAdhdControlPlaneRoot = path.join(repoRoot, ".github", "i-have-adhd-sync");
const iHaveAdhdRepository = "https://github.com/ayghri/i-have-adhd";
const iHaveAdhdDestinationPrefix = "skills/productivity/i-have-adhd/";
const taiwanTerminologyControlPlaneRoot = path.join(repoRoot, ".github", "taiwan-terminology-sync");
const emilControlPlaneRoot = path.join(repoRoot, ".github", "emil-skills-sync");
const taiwanTerminologyRepository = "https://github.com/frank890417/taiwan-md";
const taiwanTerminologyRoot = path.join(repoRoot, "skills", "language", "taiwan-term");
const policy = loadPolicy(controlPlaneRoot);
const excludedSkillNames = new Set(policy.excludedSkillNames ?? []);
const excludedSkillPathSegments = new Set(policy.excludedSkillPathSegments ?? []);
const categoryMap = policy.categoryMap ?? {};

function filesNamed(directory, filename, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) filesNamed(fullPath, filename, result);
    else if (entry.isFile() && entry.name === filename) result.push(fullPath);
  }
  return result;
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function listFiles(root, directory = root, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) listFiles(root, fullPath, result);
    else if (entry.isFile()) result.push(normalize(path.relative(root, fullPath)));
  }
  return result.sort();
}

function frontmatter(file) {
  const content = readFileSync(file, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const field = (name) => match[1].match(new RegExp(`^${name}:\\s*["']?(.+?)["']?\\s*$`, "m"))?.[1];
  return {
    name: field("name"),
    description: field("description"),
    explicit: /^disable-model-invocation:\s*true\s*$/m.test(match[1]),
  };
}

const skillFiles = filesNamed(path.join(repoRoot, "skills"), "SKILL.md").sort();
const runtimeNames = new Map();
for (const file of skillFiles) {
  const relative = path.relative(repoRoot, file).split(path.sep).join("/");
  const metadata = frontmatter(file);
  if (!metadata?.name || !metadata?.description) {
    errors.push(`Missing name or description frontmatter: ${relative}`);
    continue;
  }
  const directoryName = path.basename(path.dirname(file));
  if (metadata.name !== directoryName) {
    errors.push(`Frontmatter name '${metadata.name}' does not match directory '${directoryName}': ${relative}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name)) {
    errors.push(`Runtime skill name is not slash-command safe: ${metadata.name}`);
  }
  if (excludedSkillNames.has(metadata.name) || isExcludedUpstreamPath(relative, policy)) {
    errors.push(`Non-runtime skill is present in the direct checkout: ${relative}`);
  }
  if (runtimeNames.has(metadata.name)) {
    errors.push(`Duplicate runtime skill '${metadata.name}': ${runtimeNames.get(metadata.name)} and ${relative}`);
  }
  runtimeNames.set(metadata.name, relative);

  if (existsSync(path.join(path.dirname(file), "agents"))) {
    errors.push(`Unexpected external agent metadata in Antigravity skill: ${relative}`);
  }
  if (relative.startsWith("skills/in-progress/") && !metadata.explicit) {
    errors.push(`In-progress skill must require explicit invocation: ${relative}`);
  }
}

const rootReadme = path.join(repoRoot, "README.md");
if (existsSync(rootReadme)) {
  const content = readFileSync(rootReadme, "utf8");
  const links = [...content.matchAll(/\]\((skills\/[^)#]+\/SKILL\.md)(?:#[^)]*)?\)/g)]
    .map((match) => match[1]);
  for (const link of links) {
    if (!existsSync(path.join(repoRoot, link))) {
      errors.push(`README skill link does not exist: ${link}`);
    }
  }
  const documented = [...new Set(links.map((link) => path.posix.basename(path.posix.dirname(link))))].sort();
  const runtime = [...runtimeNames.keys()].sort();
  if (JSON.stringify(documented) !== JSON.stringify(runtime)) {
    const missing = runtime.filter((name) => !documented.includes(name));
    const extra = documented.filter((name) => !runtimeNames.has(name));
    errors.push(`README runtime skill inventory does not match the installed runtime skills (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"})`);
  }
}

const excludedReferenceSegments = [...excludedSkillNames, ...excludedSkillPathSegments];
for (const file of readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(repoRoot, "skills", entry.name, "README.md"))
  .filter(existsSync)) {
  const relative = normalize(path.relative(repoRoot, file));
  const content = readFileSync(file, "utf8");
  for (const segment of excludedReferenceSegments) {
    if (content.includes(`./${segment}/`)) {
      errors.push(`Skill index references an excluded path './${segment}/': ${relative}`);
    }
  }
}

const repositoryFiles = listFiles(repoRoot);
for (const relative of repositoryFiles.filter((file) => isExcludedUpstreamPath(file, policy))) {
  errors.push(`Non-runtime excluded path is present: ${relative}`);
}
for (const [sourceCategory, targetCategory] of Object.entries(categoryMap)) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sourceCategory) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetCategory)) {
    errors.push(`Invalid upstream categoryMap entry: ${sourceCategory} -> ${targetCategory}`);
  } else if (sourceCategory !== targetCategory && repositoryFiles.some((file) => file.startsWith(`skills/${sourceCategory}/`))) {
    errors.push(`Unmapped source skill directory still exists for '${sourceCategory}': expected 'skills/${targetCategory}/'`);
  }
}

const required = [
  ".github/skill-sync/sources.json",
  ".github/skill-sync/sync.mjs",
  ".github/skill-sync/indexes.mjs",
  ".github/workflows/sync-skills.yml",
  ".github/workflows/sync-source.yml",
  ".github/upstream-sync/apply-upstream-snapshot.mjs",
  ".github/upstream-sync/lib/policy.mjs",
  ".github/upstream-sync/ownership.json",
  ".github/security-audit-sync/apply-upstream-snapshot.mjs",
  ".github/security-audit-sync/upstream-lock.json",
  ".github/i-have-adhd-sync/apply-upstream-snapshot.mjs",
  ".github/i-have-adhd-sync/upstream-lock.json",
  ".github/emil-skills-sync/apply-upstream-snapshot.mjs",
  ".github/emil-skills-sync/lib.mjs",
  ".github/emil-skills-sync/upstream-lock.json",
  ".github/taiwan-terminology-sync/apply_upstream_snapshot.py",
  ".github/taiwan-terminology-sync/upstream-lock.json",
  "rules/skills.md",
  "LICENSE",
  ...(typeof policy.upstreamLicensePath === "string" && policy.upstreamLicensePath.trim() ? [policy.upstreamLicensePath] : []),
  "skills/productivity/README.md",
  "skills/software/README.md",
  "skills/security/README.md",
  "skills/ui-design/README.md",
  "skills/security/security-audit/LICENSE",
  "skills/security/security-audit/SKILL.md",
  "skills/security/security-audit/report-schema.json",
  "skills/productivity/i-have-adhd/LICENSE",
  "skills/productivity/i-have-adhd/SKILL.md",
  "skills/language/taiwan-term/SKILL.md",
  "skills/language/taiwan-term/scripts/audit_terms.py",
  "skills/language/taiwan-term/scripts/build_snapshot.py",
  "skills/language/taiwan-term/references/taiwan-md/NOTICE.md",
  "skills/language/taiwan-term/references/taiwan-md/UPSTREAM.json",
  "skills/language/taiwan-term/references/taiwan-md/terminology.snapshot.json",
  "MAINTENANCE.md",
  ".github/workflows/validate-antigravity.yml",
  "README.md",
];
for (const relative of required) {
  if (!existsSync(path.join(repoRoot, relative))) errors.push(`Required project file is missing: ${relative}`);
}

for (const forbidden of [".agents", ".antigravity"]) {
  const forbiddenPath = path.join(repoRoot, forbidden);
  if (!existsSync(forbiddenPath)) continue;

  const entry = lstatSync(forbiddenPath);
  const isEmptyDirectory = entry.isDirectory() && readdirSync(forbiddenPath).length === 0;
  if (!isEmptyDirectory) {
    errors.push(`Direct checkout contains a forbidden nested runtime/control directory: ${forbidden}`);
  }
}

try {
  JSON.parse(readFileSync(path.join(repoRoot, "skills/security/security-audit/report-schema.json"), "utf8"));
} catch (error) {
  errors.push(`Invalid security-audit report schema: ${error.message}`);
}

try {
  if (!frontmatter(path.join(repoRoot, "skills/productivity/i-have-adhd/SKILL.md"))?.explicit) {
    errors.push("i-have-adhd must require explicit invocation");
  }
} catch (error) {
  errors.push(`Invalid i-have-adhd invocation policy: ${error.message}`);
}

for (const category of ["productivity", "software", "ui-design"]) {
  const categoryReadme = path.join(repoRoot, "skills", category, "README.md");
  if (!existsSync(categoryReadme)) continue;
  const content = readFileSync(categoryReadme, "utf8");
  const links = [...content.matchAll(/\]\((\.\/([a-z0-9-]+)\/SKILL\.md)(?:#[^)]*)?\)/g)];
  for (const match of links) {
    if (!existsSync(path.join(repoRoot, "skills", category, match[1]))) {
      errors.push(`Category README skill link does not exist: skills/${category}/${match[1]}`);
    }
  }
  const documented = [...new Set(links.map((match) => match[2]))].sort();
  const runtime = [...runtimeNames.entries()]
    .filter(([, relative]) => relative.startsWith(`skills/${category}/`))
    .map(([name]) => name)
    .sort();
  if (JSON.stringify(documented) !== JSON.stringify(runtime)) {
    const missing = runtime.filter((name) => !documented.includes(name));
    const extra = documented.filter((name) => !runtime.includes(name));
    errors.push(`skills/${category}/README.md inventory does not match installed runtime skills (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"})`);
  }
}

try {
  const lock = JSON.parse(readFileSync(path.join(controlPlaneRoot, "upstream-lock.json"), "utf8"));
  if (lock.repository !== policy.upstream) {
    errors.push("Upstream lock repository does not match policy");
  }
  if (!/^[0-9a-f]{40}$/.test(lock.commit ?? "")) {
    errors.push("Upstream lock commit must be a full lowercase commit SHA");
  }
  if (typeof policy.upstreamLicensePath !== "string" || !policy.upstreamLicensePath.trim()) {
    errors.push("Upstream policy must define upstreamLicensePath");
  }
  if (!Array.isArray(lock.files) || lock.files.some((file) => typeof file !== "string")) {
    errors.push("Upstream lock files must be an array of paths");
  } else {
    const sortedUnique = [...new Set(lock.files)].sort();
    if (JSON.stringify(lock.files) !== JSON.stringify(sortedUnique)) {
      errors.push("Upstream lock files must be sorted and unique");
    }
    const isManagedUpstream = (file) => file === policy.upstreamLicensePath || matchesAny(file, policy.upstreamAllowlist);
    const actual = repositoryFiles.filter(
      (file) => isManagedUpstream(file) && !matchesAny(file, policy.projectOwned),
    );
    if (JSON.stringify(sortedUnique) !== JSON.stringify(actual)) {
      errors.push("Upstream lock inventory does not match the composed upstream files");
    }
    if (typeof policy.upstreamLicensePath === "string" && policy.upstreamLicensePath.trim() &&
        !lock.files.includes(policy.upstreamLicensePath)) {
      errors.push(`Upstream lock must include ${policy.upstreamLicensePath}`);
    }
  }
  for (const file of Array.isArray(lock.files) ? lock.files : []) {
    const isManagedUpstream = file === policy.upstreamLicensePath || matchesAny(file, policy.upstreamAllowlist);
    if (!isManagedUpstream) errors.push(`Upstream lock contains a non-allowlisted file: ${file}`);
    if (matchesAny(file, policy.blockedUpstreamPaths) || matchesAny(file, policy.projectOwned)) {
      errors.push(`Upstream lock contains a project-owned collision: ${file}`);
    }
  }
} catch (error) {
  errors.push(`Invalid upstream lock: ${error.message}`);
}

try {
  const lock = JSON.parse(
    readFileSync(path.join(securityAuditControlPlaneRoot, "upstream-lock.json"), "utf8"),
  );
  if (lock.repository !== securityAuditRepository) {
    errors.push("Security-audit lock repository does not match Cloudflare upstream");
  }
  if (!/^[0-9a-f]{40}$/.test(lock.commit ?? "")) {
    errors.push("Security-audit lock commit must be a full lowercase commit SHA");
  }
  if (!Array.isArray(lock.files) || lock.files.some((file) => typeof file !== "string")) {
    errors.push("Security-audit lock files must be an array of paths");
  } else {
    const sortedUnique = [...new Set(lock.files)].sort();
    if (JSON.stringify(lock.files) !== JSON.stringify(sortedUnique)) {
      errors.push("Security-audit lock files must be sorted and unique");
    }
    const actual = repositoryFiles
      .filter((file) => file.startsWith(securityAuditDestinationPrefix))
      .map((file) => {
        const relative = file.slice(securityAuditDestinationPrefix.length);
        return relative === "LICENSE" ? "LICENSE" : `skills/security-audit/${relative}`;
      })
      .sort();
    if (JSON.stringify(sortedUnique) !== JSON.stringify(actual)) {
      errors.push("Security-audit lock inventory does not match the installed Cloudflare files");
    }
    for (const file of lock.files) {
      if (file !== "LICENSE" && !file.startsWith("skills/security-audit/")) {
        errors.push(`Security-audit lock contains an out-of-scope file: ${file}`);
      }
    }
  }
} catch (error) {
  errors.push(`Invalid security-audit lock: ${error.message}`);
}

try {
  const lock = JSON.parse(readFileSync(path.join(iHaveAdhdControlPlaneRoot, "upstream-lock.json"), "utf8"));
  if (lock.repository !== iHaveAdhdRepository) errors.push("i-have-adhd lock repository does not match upstream");
  if (!/^[0-9a-f]{40}$/.test(lock.commit ?? "")) errors.push("i-have-adhd lock commit must be a full lowercase commit SHA");
  const sortedUnique = Array.isArray(lock.files) ? [...new Set(lock.files)].sort() : [];
  const actual = repositoryFiles
    .filter((file) => file.startsWith(iHaveAdhdDestinationPrefix))
    .map((file) => {
      const relative = file.slice(iHaveAdhdDestinationPrefix.length);
      return relative === "LICENSE" ? "LICENSE" : `skills/i-have-adhd/${relative}`;
    })
    .sort();
  if (!Array.isArray(lock.files) || JSON.stringify(lock.files) !== JSON.stringify(sortedUnique)) {
    errors.push("i-have-adhd lock files must be a sorted unique array");
  } else if (JSON.stringify(sortedUnique) !== JSON.stringify(actual)) {
    errors.push("i-have-adhd lock inventory does not match the installed files");
  }
} catch (error) {
  errors.push(`Invalid i-have-adhd lock: ${error.message}`);
}

try {
  const lock = JSON.parse(readFileSync(path.join(emilControlPlaneRoot, "upstream-lock.json"), "utf8"));
  if (lock.repository !== emilRepository) errors.push("Emil lock repository does not match upstream");
  if (!/^[0-9a-f]{40}$/.test(lock.commit ?? "")) errors.push("Emil lock commit must be a full lowercase commit SHA");
  if (!Array.isArray(lock.files) || lock.files.some((file) => typeof file !== "string")) {
    errors.push("Emil lock files must be an array of paths");
  } else {
    const sortedUnique = [...new Set(lock.files)].sort();
    if (JSON.stringify(lock.files) !== JSON.stringify(sortedUnique)) errors.push("Emil lock files must be sorted and unique");
    const actual = [...new Set(repositoryFiles
      .filter((file) => file.startsWith(emilDestinationPrefix) && file !== `${emilDestinationPrefix}README.md`)
      .map((file) => {
        const [name, ...segments] = file.slice(emilDestinationPrefix.length).split("/");
        const relative = segments.join("/");
        return relative === "LICENSE" ? "LICENSE" : `skills/${upstreamSkillName(name)}/${relative}`;
      }))].sort();
    if (JSON.stringify(sortedUnique) !== JSON.stringify(actual)) errors.push("Emil lock inventory does not match the installed files");
    const sourceSkills = lock.files.filter((file) => /^skills\/[^/]+\/SKILL\.md$/.test(file));
    if (!sourceSkills.length || !lock.files.includes("LICENSE")) errors.push("Emil lock must include skills and the upstream license");
    for (const file of lock.files) {
      if (file !== "LICENSE" && !/^skills\/[a-z0-9]+(?:-[a-z0-9]+)*\/.+/.test(file)) {
        errors.push(`Emil lock contains an out-of-scope file: ${file}`);
      }
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
  const lock = JSON.parse(
    readFileSync(path.join(taiwanTerminologyControlPlaneRoot, "upstream-lock.json"), "utf8"),
  );
  const metadata = JSON.parse(
    readFileSync(path.join(taiwanTerminologyRoot, "references", "taiwan-md", "UPSTREAM.json"), "utf8"),
  );
  const snapshotPath = path.join(
    taiwanTerminologyRoot,
    "references",
    "taiwan-md",
    "terminology.snapshot.json",
  );
  const snapshotBytes = readFileSync(snapshotPath);
  const snapshot = JSON.parse(snapshotBytes.toString("utf8"));
  const expectedSourcePaths = ["README.md", "data/terminology/*.yaml"];
  if (lock.repository !== taiwanTerminologyRepository || metadata.repository !== taiwanTerminologyRepository) {
    errors.push("Taiwan terminology source repository does not match Taiwan.md upstream");
  }
  if (!/^[0-9a-f]{40}$/.test(lock.commit ?? "") || lock.commit !== metadata.commit) {
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
  if (snapshot.schema_version !== 1 || snapshot.source?.repository !== taiwanTerminologyRepository ||
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

const pluginsRoot = path.join(repoRoot, "plugins");
if (existsSync(pluginsRoot)) {
  const allowedPluginManifestFields = new Set([
    "name", "displayName", "description", "version", "author",
    "homepage", "repository", "logo", "suggestedPrompts", "disabled",
  ]);
  const pluginSkillOwners = new Map();
  const compilePatterns = (patterns, label) => {
    if (!Array.isArray(patterns)) return [];
    return patterns.map((pattern) => {
      if (typeof pattern !== "string" || !pattern) {
        errors.push(`Invalid pattern in ${label}`);
        return null;
      }
      return new RegExp(`^(?:${pattern})$`);
    }).filter(Boolean);
  };
  for (const entry of readdirSync(pluginsRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(pluginsRoot, entry.name);
    const relativeDir = `plugins/${entry.name}`;
    const manifestPath = path.join(pluginDir, "plugin.json");
    const skillsConfigPath = path.join(pluginDir, "skills.json");
    if (!existsSync(manifestPath)) {
      errors.push(`Missing plugin.json: ${relativeDir}`);
      continue;
    }
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      for (const key of Object.keys(manifest)) {
        if (!allowedPluginManifestFields.has(key)) {
          errors.push(`Unknown plugin.json field '${key}': ${relativeDir}/plugin.json`);
        }
      }
      if (manifest.name !== entry.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name ?? "")) {
        errors.push(`Invalid plugin.json name '${manifest.name}': ${relativeDir}/plugin.json`);
      }
      if (typeof manifest.version !== "string" || !manifest.version.trim()) {
        errors.push(`Missing plugin.json version: ${relativeDir}/plugin.json`);
      }
      if (typeof manifest.description !== "string" || !manifest.description.trim()) {
        errors.push(`Missing plugin.json description: ${relativeDir}/plugin.json`);
      }
    } catch (error) {
      errors.push(`Invalid plugin.json (${relativeDir}): ${error.message}`);
    }

    const rulesFile = path.join(pluginDir, "rules", "AGENTS.md");
    if (existsSync(rulesFile)) {
      const stat = lstatSync(rulesFile);
      if (!stat.isFile()) {
        errors.push(`Plugin rules/AGENTS.md must be a regular file: ${relativeDir}/rules/AGENTS.md`);
      } else {
        const rulesBytes = readFileSync(rulesFile);
        if (rulesBytes.length > 24_000) {
          errors.push(`Plugin rules/AGENTS.md exceeds 24,000 bytes: ${relativeDir}/rules/AGENTS.md`);
        }
        if (/^---\r?\n/.test(rulesBytes.toString("utf8"))) {
          errors.push(`Plugin rules/AGENTS.md must not include YAML frontmatter: ${relativeDir}/rules/AGENTS.md`);
        }
      }
    }

    if (!existsSync(skillsConfigPath)) {
      errors.push(`Missing skills.json: ${relativeDir}`);
      continue;
    }
    try {
      const config = JSON.parse(readFileSync(skillsConfigPath, "utf8"));
      if (!Array.isArray(config.entries) || config.entries.length === 0) {
        errors.push(`Plugin skills.json requires a non-empty entries array: ${relativeDir}/skills.json`);
        continue;
      }
      for (const item of config.entries) {
        if (typeof item?.path !== "string" || !item.path.trim()) {
          errors.push(`Invalid entry path in ${relativeDir}/skills.json`);
          continue;
        }
        const resolved = path.resolve(pluginDir, item.path);
        const repoPrefix = `${repoRoot}${path.sep}`;
        if (resolved !== repoRoot && !resolved.startsWith(repoPrefix)) {
          errors.push(`Plugin entry escapes repository root (${item.path}): ${relativeDir}/skills.json`);
          continue;
        }
        if (!existsSync(resolved) || !lstatSync(resolved).isDirectory()) {
          errors.push(`Plugin entry directory does not exist (${item.path}): ${relativeDir}/skills.json`);
          continue;
        }
        const includeOnly = item.include_only ? compilePatterns(item.include_only, `${relativeDir}/skills.json`) : null;
        const exclude = item.exclude ? compilePatterns(item.exclude, `${relativeDir}/skills.json`) : [];
        for (const child of readdirSync(resolved, { withFileTypes: true })) {
          if (!child.isDirectory()) continue;
          if (!existsSync(path.join(resolved, child.name, "SKILL.md"))) continue;
          if (includeOnly && !includeOnly.some((re) => re.test(child.name))) continue;
          if (exclude.some((re) => re.test(child.name))) continue;
          if (pluginSkillOwners.has(child.name)) {
            errors.push(`Skill '${child.name}' is mapped by multiple plugins: ${pluginSkillOwners.get(child.name)} and ${entry.name}`);
          } else {
            pluginSkillOwners.set(child.name, entry.name);
          }
        }
      }
    } catch (error) {
      errors.push(`Invalid skills.json (${relativeDir}): ${error.message}`);
    }
  }
  const runtimeList = [...runtimeNames.keys()].sort();
  const pluginList = [...pluginSkillOwners.keys()].sort();
  if (JSON.stringify(pluginList) !== JSON.stringify(runtimeList)) {
    const missing = runtimeList.filter((name) => !pluginSkillOwners.has(name));
    const extra = pluginList.filter((name) => !runtimeNames.has(name));
    errors.push(`Plugin skill coverage does not match runtime skills (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"})`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Repository is valid as a direct Agent home: ${runtimeNames.size} runtime skills.`);
}

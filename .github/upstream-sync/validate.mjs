#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadPolicy, matchesAny } from "./lib/policy.mjs";

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
const agentSkillsControlPlaneRoot = path.join(repoRoot, ".github", "agent-skills-sync");
const agentSkillsRepository = "https://github.com/addyosmani/agent-skills";
const agentSkillsDestinationPrefix = "skills/addyosmani-pack/";
const lifecyclePhases = ["spec", "planning", "build", "test", "review", "ship"];
const policy = loadPolicy(controlPlaneRoot);
const excludedSkillNames = new Set(policy.excludedSkillNames ?? []);
const excludedSkillPathSegments = new Set(policy.excludedSkillPathSegments ?? []);

function isExcludedSkillPath(relative) {
  const segments = relative.split("/");
  return segments[0] === "skills" && segments.slice(1).some(
    (segment) => excludedSkillNames.has(segment) || excludedSkillPathSegments.has(segment),
  );
}

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
  return { name: field("name"), description: field("description") };
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
  if (excludedSkillNames.has(metadata.name) || isExcludedSkillPath(relative)) {
    errors.push(`Non-runtime skill is present in the direct checkout: ${relative}`);
  }
  if (runtimeNames.has(metadata.name)) {
    errors.push(`Duplicate runtime skill '${metadata.name}': ${runtimeNames.get(metadata.name)} and ${relative}`);
  }
  runtimeNames.set(metadata.name, relative);
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
for (const relative of repositoryFiles.filter(isExcludedSkillPath)) {
  errors.push(`Non-runtime excluded path is present: ${relative}`);
}

const required = [
  ".github/upstream-sync/apply-upstream-snapshot.mjs",
  ".github/upstream-sync/lib/policy.mjs",
  ".github/upstream-sync/ownership.json",
  ".github/security-audit-sync/apply-upstream-snapshot.mjs",
  ".github/security-audit-sync/upstream-lock.json",
  ".github/i-have-adhd-sync/apply-upstream-snapshot.mjs",
  ".github/i-have-adhd-sync/upstream-lock.json",
  ".github/agent-skills-sync/apply-upstream-snapshot.mjs",
  ".github/agent-skills-sync/README.md",
  ".github/agent-skills-sync/selection.json",
  ".github/agent-skills-sync/upstream-lock.json",
  "rules/skills.md",
  "skills/security/README.md",
  "skills/security/security-audit/LICENSE",
  "skills/security/security-audit/SKILL.md",
  "skills/security/security-audit/report-schema.json",
  "skills/productivity/i-have-adhd/LICENSE",
  "skills/productivity/i-have-adhd/SKILL.md",
  "skills/productivity/i-have-adhd/agents/openai.yaml",
  "MAINTENANCE.md",
  ".github/workflows/sync-security-audit.yml",
  ".github/workflows/sync-i-have-adhd.yml",
  ".github/workflows/sync-agent-skills.yml",
  ".github/workflows/sync-upstream.yml",
  ".github/workflows/validate-antigravity.yml",
];
for (const relative of required) {
  if (!existsSync(path.join(repoRoot, relative))) errors.push(`Required fork file is missing: ${relative}`);
}
for (const phase of lifecyclePhases) {
  for (const relative of [`skills/lifecycle/${phase}/SKILL.md`, `skills/lifecycle/${phase}/agents/openai.yaml`]) {
    if (!existsSync(path.join(repoRoot, relative))) errors.push(`Required lifecycle file is missing: ${relative}`);
  }
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
  const skill = readFileSync(path.join(repoRoot, "skills/productivity/i-have-adhd/SKILL.md"), "utf8");
  const codex = readFileSync(path.join(repoRoot, "skills/productivity/i-have-adhd/agents/openai.yaml"), "utf8");
  if (!/^disable-model-invocation:\s*true\s*$/m.test(skill) ||
      !/^\s*allow_implicit_invocation:\s*false\s*$/m.test(codex)) {
    errors.push("i-have-adhd must require explicit invocation");
  }
} catch (error) {
  errors.push(`Invalid i-have-adhd invocation policy: ${error.message}`);
}

try {
  const lock = JSON.parse(readFileSync(path.join(controlPlaneRoot, "upstream-lock.json"), "utf8"));
  if (lock.repository !== policy.upstream) {
    errors.push("Upstream lock repository does not match policy");
  }
  if (!/^[0-9a-f]{40}$/.test(lock.commit ?? "")) {
    errors.push("Upstream lock commit must be a full lowercase commit SHA");
  }
  if (!Array.isArray(lock.files) || lock.files.some((file) => typeof file !== "string")) {
    errors.push("Upstream lock files must be an array of paths");
  } else {
    const sortedUnique = [...new Set(lock.files)].sort();
    if (JSON.stringify(lock.files) !== JSON.stringify(sortedUnique)) {
      errors.push("Upstream lock files must be sorted and unique");
    }
    const actual = repositoryFiles.filter(
      (file) => matchesAny(file, policy.upstreamAllowlist) && !matchesAny(file, policy.forkOwned),
    );
    if (JSON.stringify(sortedUnique) !== JSON.stringify(actual)) {
      errors.push("Upstream lock inventory does not match the composed upstream files");
    }
  }
  for (const file of Array.isArray(lock.files) ? lock.files : []) {
    if (!matchesAny(file, policy.upstreamAllowlist)) errors.push(`Upstream lock contains a non-allowlisted file: ${file}`);
    if (matchesAny(file, policy.blockedUpstreamPaths)) errors.push(`Upstream lock contains a fork-owned collision: ${file}`);
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
  const selection = JSON.parse(readFileSync(path.join(agentSkillsControlPlaneRoot, "selection.json"), "utf8"));
  const lock = JSON.parse(readFileSync(path.join(agentSkillsControlPlaneRoot, "upstream-lock.json"), "utf8"));
  const sortedSkills = Array.isArray(selection.skills) ? [...new Set(selection.skills)].sort() : [];
  if (selection.repository !== agentSkillsRepository || lock.repository !== agentSkillsRepository) {
    errors.push("Addy repository metadata does not match upstream");
  }
  if (!Array.isArray(selection.skills) || JSON.stringify(selection.skills) !== JSON.stringify(sortedSkills)) {
    errors.push("Addy selection skills must be a sorted unique array");
  }
  if (selection.skills?.includes("using-agent-skills")) errors.push("Addy selection must not install its competing router");
  if (!/^[0-9a-f]{40}$/.test(lock.commit ?? "")) errors.push("Addy lock commit must be a full lowercase commit SHA");
  if (JSON.stringify(lock.skills) !== JSON.stringify(sortedSkills)) errors.push("Addy lock skills do not match selection");

  const sortedFiles = Array.isArray(lock.files) ? [...new Set(lock.files)].sort() : [];
  const actual = repositoryFiles
    .filter((file) => file.startsWith(agentSkillsDestinationPrefix))
    .map((file) => file.slice(agentSkillsDestinationPrefix.length))
    .sort();
  if (!Array.isArray(lock.files) || JSON.stringify(lock.files) !== JSON.stringify(sortedFiles)) {
    errors.push("Addy lock files must be a sorted unique array");
  } else if (JSON.stringify(sortedFiles) !== JSON.stringify(actual)) {
    errors.push("Addy lock inventory does not match installed files");
  }
  for (const name of sortedSkills) {
    const relative = `skills/addyosmani-pack/skills/${name}/SKILL.md`;
    const skillPath = path.join(repoRoot, relative);
    if (!existsSync(skillPath)) {
      errors.push(`Selected Addy skill is missing: ${name}`);
      continue;
    }
    const content = readFileSync(skillPath, "utf8");
    if (/^disable-model-invocation:\s*true\s*$/m.test(content)) {
      errors.push(`Lifecycle dependency cannot be explicit-only: ${name}`);
    }
    for (const match of content.matchAll(/\.\.\/\.\.\/references\/([A-Za-z0-9._/-]+)/g)) {
      if (!existsSync(path.resolve(path.dirname(skillPath), match[0]))) {
        errors.push(`Addy skill has a missing shared reference '${match[1]}': ${relative}`);
      }
    }
  }
  for (const file of lock.files ?? []) {
    const selectedName = file.match(/^skills\/([^/]+)\//)?.[1];
    if (file !== "LICENSE" && !file.startsWith("references/") && !sortedSkills.includes(selectedName)) {
      errors.push(`Addy lock contains an out-of-scope file: ${file}`);
    }
  }
  for (const file of skillFiles.filter((file) => normalize(path.relative(repoRoot, file)).startsWith(
    `${agentSkillsDestinationPrefix}skills/`,
  ))) {
    const name = path.basename(path.dirname(file));
    if (!sortedSkills.includes(name)) errors.push(`Unselected Addy skill is installed: ${name}`);
  }
} catch (error) {
  errors.push(`Invalid Addy agent-skills integration: ${error.message}`);
}

for (const phase of lifecyclePhases) {
  try {
    const root = path.join(repoRoot, "skills", "lifecycle", phase);
    const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");
    const codex = readFileSync(path.join(root, "agents", "openai.yaml"), "utf8");
    if (!/^disable-model-invocation:\s*true\s*$/m.test(skill) ||
        !/^\s*allow_implicit_invocation:\s*false\s*$/m.test(codex)) {
      errors.push(`Lifecycle phase must require explicit invocation: ${phase}`);
    }
  } catch (error) {
    errors.push(`Invalid lifecycle phase '${phase}': ${error.message}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Repository is valid as a direct Agent home: ${runtimeNames.size} runtime skills.`);
}

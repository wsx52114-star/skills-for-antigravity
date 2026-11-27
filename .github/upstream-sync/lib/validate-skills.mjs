import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { isExcludedUpstreamPath } from "./policy.mjs";
import { parseSkillFrontmatter, toPosixPath } from "./snapshot.mjs";

function filesNamed(directory, filename, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) filesNamed(fullPath, filename, result);
    else if (entry.isFile() && entry.name === filename) result.push(fullPath);
  }
  return result;
}

export function listFiles(root, directory = root, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) listFiles(root, fullPath, result);
    else if (entry.isFile()) result.push(toPosixPath(path.relative(root, fullPath)));
  }
  return result.sort();
}

export function validateSkillsAndLayout(repoRoot, policy, sources, repositoryFiles, errors) {
  const excludedSkillNames = new Set(policy.excludedSkillNames ?? []);
  const excludedSkillPathSegments = new Set(policy.excludedSkillPathSegments ?? []);
  const categoryMap = policy.categoryMap ?? {};

  const skillFiles = filesNamed(path.join(repoRoot, "skills"), "SKILL.md").sort();
  const runtimeNames = new Map();
  for (const file of skillFiles) {
    const relative = toPosixPath(path.relative(repoRoot, file));
    const metadata = parseSkillFrontmatter(readFileSync(file, "utf8"));
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
    const relative = toPosixPath(path.relative(repoRoot, file));
    const content = readFileSync(file, "utf8");
    for (const segment of excludedReferenceSegments) {
      if (content.includes(`./${segment}/`)) {
        errors.push(`Skill index references an excluded path './${segment}/': ${relative}`);
      }
    }
  }

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

  const sourceArtifacts = Object.values(sources).flatMap((source) => [source.adapter, source.lock]);
  const required = [...new Set([
    ".github/skill-sync/sources.json",
    ".github/skill-sync/sync.mjs",
    ".github/skill-sync/indexes.mjs",
    ".github/workflows/sync-skills.yml",
    ".github/workflows/sync-source.yml",
    ".github/upstream-sync/lib/policy.mjs",
    ".github/upstream-sync/ownership.json",
    ".github/emil-skills-sync/lib.mjs",
    ...sourceArtifacts,
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
  ])];
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
    if (!parseSkillFrontmatter(readFileSync(path.join(repoRoot, "skills/productivity/i-have-adhd/SKILL.md"), "utf8"))?.explicit) {
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

  return runtimeNames;
}

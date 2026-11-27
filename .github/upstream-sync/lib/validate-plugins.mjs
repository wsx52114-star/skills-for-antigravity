import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export function validatePlugins(repoRoot, runtimeNames, errors) {
  const pluginsRoot = path.join(repoRoot, "plugins");
  if (!existsSync(pluginsRoot)) return;

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

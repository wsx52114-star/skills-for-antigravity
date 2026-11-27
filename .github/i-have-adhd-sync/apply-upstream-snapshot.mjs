#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";
import { matchFrontmatter, syncSingleSkillSnapshot } from "../upstream-sync/lib/snapshot.mjs";

function requireExplicitInvocation(content) {
  const matched = matchFrontmatter(content);
  if (!matched) throw new Error("Invalid i-have-adhd SKILL.md: YAML frontmatter is required");
  let frontmatter = matched.body;
  if (/^disable-model-invocation:/m.test(frontmatter)) {
    frontmatter = frontmatter.replace(/^disable-model-invocation:.*$/m, "disable-model-invocation: true");
  } else {
    frontmatter += "\ndisable-model-invocation: true";
  }
  return `---\n${frontmatter}\n---${matched.rest}`;
}

try {
  syncSingleSkillSnapshot({
    sourceId: "i-have-adhd",
    label: "i-have-adhd",
    upstreamSkillPath: "skills/i-have-adhd",
    localSkillPath: "skills/productivity/i-have-adhd",
    transformFile: (relativePath, sourcePath) =>
      relativePath === "SKILL.md" ? requireExplicitInvocation(readFileSync(sourcePath, "utf8")) : null,
  });
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const rulesFile = path.join(repoRoot, "rules", "skills.md");
const content = readFileSync(rulesFile, "utf8");

test("global skill rules stay compact and preserve the required contracts", () => {
  assert.ok(content.length <= 12_000, `rules/skills.md is ${content.length} characters`);
  for (const heading of [
    "## Invocation Contract",
    "## Project Knowledge",
    "## Golden Workflow",
    "## Antigravity Translation",
    "## Technology Adaptation",
    "## Safety Guardrails",
  ]) {
    assert.match(content, new RegExp(`^${heading}$`, "m"));
  }
  assert.match(content, /disable-model-invocation/);
  for (const contract of [
    "smallest set",
    "unavailable or unreadable",
    "system and safety constraints",
    "glossary-only `CONTEXT.md`",
  ]) {
    assert.ok(content.includes(contract), `Missing rules contract: ${contract}`);
  }
});

test("global skill rules contain no legacy paths, names, or static inventory", () => {
  for (const legacy of [
    "~/.gemini/config/skills",
    ".agents/CONTEXT.md",
    ".agents/docs/adr",
    "to-issues",
    "to-prd",
    "git-guardrails-claude-code",
    "decision-mapping",
    "## Available Skills",
    "## Project Override",
  ]) {
    assert.doesNotMatch(content, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.equal(existsSync(path.join(repoRoot, "rules", "desktop.ini")), false);
});

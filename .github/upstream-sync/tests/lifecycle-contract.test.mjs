import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const originalSkills = [
  "ask-matt", "code-review", "codebase-design", "diagnosing-bugs", "domain-modeling",
  "grill-me", "grill-with-docs", "grilling", "handoff", "i-have-adhd", "implement",
  "improve-codebase-architecture", "loop-me", "migrate-to-shoehorn", "prototype", "research",
  "resolving-merge-conflicts", "scaffold-exercises", "security-audit", "setup-matt-pocock-skills",
  "setup-pre-commit", "setup-ts-deep-modules", "tdd", "teach", "to-questionnaire", "to-spec",
  "to-tickets", "triage", "wait-what", "wayfinder", "wizard", "writing-beats",
  "writing-for-agents", "writing-fragments", "writing-shape",
];
const phases = {
  spec: ["grilling", "domain-modeling", "api-and-interface-design"],
  planning: ["prototype", "api-and-interface-design"],
  build: ["tdd", "codebase-design", "source-driven-development"],
  test: ["tdd", "diagnosing-bugs", "performance-optimization"],
  review: ["code-review", "security-audit", "security-and-hardening", "code-simplification"],
  ship: ["ci-cd-and-automation", "observability-and-instrumentation", "shipping-and-launch", "wizard"],
};
const selectedAddySkills = [
  "api-and-interface-design",
  "ci-cd-and-automation",
  "code-simplification",
  "deprecation-and-migration",
  "observability-and-instrumentation",
  "performance-optimization",
  "security-and-hardening",
  "shipping-and-launch",
  "source-driven-development",
];
const competingAddySkills = [
  "code-review-and-quality",
  "context-engineering",
  "debugging-and-error-recovery",
  "documentation-and-adrs",
  "git-workflow-and-versioning",
  "idea-refine",
  "incremental-implementation",
  "interview-me",
  "planning-and-task-breakdown",
  "spec-driven-development",
  "test-driven-development",
  "using-agent-skills",
];

function skillFiles(directory, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) skillFiles(fullPath, result);
    else if (entry.isFile() && entry.name === "SKILL.md") result.push(fullPath);
  }
  return result;
}

test("the original 35 slash-invoked skills remain outside the Addy pack and lifecycle layer", () => {
  const locations = new Map(
    skillFiles(path.join(repoRoot, "skills")).map((file) => [path.basename(path.dirname(file)), file]),
  );
  assert.equal(originalSkills.length, 35);
  for (const name of originalSkills) {
    const location = locations.get(name);
    assert.ok(location, `missing original skill: ${name}`);
    assert.doesNotMatch(location, /addyosmani-pack|skills[\\/]lifecycle/);
  }
});

test("six explicit lifecycle entry skills declare their orchestration dependencies", () => {
  for (const [phase, dependencies] of Object.entries(phases)) {
    const root = path.join(repoRoot, "skills", "lifecycle", phase);
    const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");
    const codex = readFileSync(path.join(root, "agents", "openai.yaml"), "utf8");
    assert.match(skill, new RegExp(`^name: ${phase}$`, "m"));
    assert.match(skill, /^disable-model-invocation:\s*true$/m);
    assert.match(codex, /^\s*allow_implicit_invocation:\s*false$/m);
    for (const dependency of dependencies) assert.match(skill, new RegExp(`\\b${dependency}\\b`));
  }
});

test("the Addy selection is exact and excludes its competing router", () => {
  const selection = JSON.parse(
    readFileSync(path.join(repoRoot, ".github", "agent-skills-sync", "selection.json"), "utf8"),
  );
  assert.deepEqual(selection.skills, selectedAddySkills);
  assert.deepEqual(selection.skills.filter((name) => competingAddySkills.includes(name)), []);
  for (const name of selection.skills) {
    assert.equal(
      existsSync(path.join(repoRoot, "skills", "addyosmani-pack", "skills", name, "SKILL.md")),
      true,
      `missing selected Addy skill: ${name}`,
    );
  }
});

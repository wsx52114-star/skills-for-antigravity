import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const syncWorkflow = readFileSync(path.join(repoRoot, ".github", "workflows", "sync-upstream.yml"), "utf8");
const validationWorkflow = readFileSync(path.join(repoRoot, ".github", "workflows", "validate-antigravity.yml"), "utf8");

test("content-only synchronization waits for required checks", () => {
  assert.match(syncWorkflow, /gh pr merge --squash --auto/);
});

test("validation workflow uses read-only repository permissions", () => {
  assert.match(validationWorkflow, /permissions:\s*\n\s+contents: read/);
});

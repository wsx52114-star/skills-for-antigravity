import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const syncWorkflow = readFileSync(path.join(repoRoot, ".github", "workflows", "sync-upstream.yml"), "utf8");
const securityAuditWorkflow = readFileSync(
  path.join(repoRoot, ".github", "workflows", "sync-security-audit.yml"),
  "utf8",
);
const validationWorkflow = readFileSync(path.join(repoRoot, ".github", "workflows", "validate-antigravity.yml"), "utf8");

test("mattpocock synchronization opens a review-only pull request", () => {
  assert.match(syncWorkflow, /gh pr create/);
  assert.doesNotMatch(syncWorkflow, /gh pr merge/);
  assert.doesNotMatch(syncWorkflow, /--auto(?:\s|$)/m);
});

test("validation workflow uses read-only repository permissions", () => {
  assert.match(validationWorkflow, /permissions:\s*\n\s+contents: read/);
});

test("Cloudflare security-audit synchronization validates and opens a review-only pull request", () => {
  assert.match(securityAuditWorkflow, /https:\/\/github\.com\/cloudflare\/security-audit-skill\.git/);
  assert.match(securityAuditWorkflow, /git ls-tree -r FETCH_HEAD/);
  assert.match(securityAuditWorkflow, /git ls-remote --heads origin/);
  assert.match(securityAuditWorkflow, /security-audit-sync\/apply-upstream-snapshot\.mjs/);
  assert.match(securityAuditWorkflow, /gh pr create/);
  assert.doesNotMatch(securityAuditWorkflow, /gh pr merge/);
  assert.doesNotMatch(securityAuditWorkflow, /--auto(?:\s|$)/m);
});

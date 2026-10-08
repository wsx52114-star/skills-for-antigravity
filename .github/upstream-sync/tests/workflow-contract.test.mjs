import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { selectSources, sourceById } from "../../skill-sync/sync.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workflowRoot = path.join(repoRoot, ".github/workflows");
const shared = readFileSync(path.join(workflowRoot, "sync-source.yml"), "utf8");
const unified = readFileSync(path.join(workflowRoot, "sync-skills.yml"), "utf8");
const validation = readFileSync(path.join(workflowRoot, "validate-antigravity.yml"), "utf8");

test("one scheduled entry point selects independent source jobs", () => {
  const scheduled = readdirSync(workflowRoot).filter((file) => /^sync-.*\.yml$/.test(file) && /\n  schedule:/.test(readFileSync(path.join(workflowRoot, file), "utf8")));
  assert.deepEqual(scheduled, ["sync-skills.yml"]);
  assert.match(unified, /cron: "0 0 \* \* 1"/);
  assert.match(unified, /fail-fast: false/);
  assert.match(unified, /fromJSON\(needs\.select-sources\.outputs\.sources\)/);
  assert.match(unified, /uses: \.\/\.github\/workflows\/sync-source\.yml/);
  assert.match(unified, /SYNC_PR_TOKEN: \$\{\{ secrets\.SYNC_PR_TOKEN \}\}/);
  for (const source of selectSources()) assert.match(unified, new RegExp(source));
});

test("the unified workflow is the only manual synchronization entry point", () => {
  const syncWorkflows = readdirSync(workflowRoot).filter((file) => /^sync-.*\.yml$/.test(file));
  assert.deepEqual(syncWorkflows.sort(), ["sync-skills.yml", "sync-source.yml"]);
  assert.match(unified, /workflow_dispatch:/);
  assert.match(unified, /type: choice/);
  assert.match(unified, /default: all/);
  assert.match(unified, /SOURCE: \$\{\{ inputs\.source \|\| 'all' \}\}/);
  assert.match(unified, /matrix --source "\$SOURCE"/);
  assert.doesNotMatch(shared, /workflow_dispatch:|schedule:/);
  for (const source of selectSources()) {
    const config = sourceById(source);
    const lock = JSON.parse(readFileSync(path.join(repoRoot, config.lock), "utf8"));
    assert.equal(lock.repository, config.repository);
    assert.equal(typeof readFileSync(path.join(repoRoot, config.adapter), "utf8"), "string");
  }
});

test("shared synchronization keeps skip, concurrency, token, and review contracts", () => {
  assert.match(shared, /workflow_call:/);
  assert.match(shared, /sync-skills-\$\{\{ inputs\.source \}\}/);
  assert.match(shared, /cancel-in-progress: false/);
  assert.match(shared, /node --test/);
  assert.match(shared, /upstream-sync\/validate\.mjs/);
  assert.match(shared, /steps\.upstream\.outputs\.changed == 'true'/);
  assert.match(shared, /steps\.commit\.outputs\.blocked == 'false'/);
  assert.match(shared, /gh api --method GET/);
  assert.match(shared, /gh api --method POST/);
  assert.match(shared, /Pull request already exists/);
  assert.match(shared, /repos\/\$GITHUB_REPOSITORY\/pulls/);
  assert.match(shared, /GH_TOKEN:\s*\$\{\{ secrets\.SYNC_PR_TOKEN \}\}/);
  assert.match(shared, /Required repository secret SYNC_PR_TOKEN is not configured/);
  assert.doesNotMatch(shared, /pull-requests:\s*write|gh pr create|gh pr merge|--auto(?:\s|$)/m);
  assert.equal((shared.match(/^          GH_TOKEN:/gm) ?? []).length, 1);
  assert.ok(shared.indexOf("GH_TOKEN:") > shared.indexOf("name: Create or update pull request"));
});

test("validation workflow uses read-only repository permissions", () => {
  assert.match(validation, /permissions:\s*\n\s+contents: read/);
  assert.match(validation, /runs-on: windows-latest/);
  assert.match(validation, /local-setup-win\.test\.ps1/);
});

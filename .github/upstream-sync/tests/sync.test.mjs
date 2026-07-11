import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const controlPlaneRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const classifier = path.join(controlPlaneRoot, "classify-sync.mjs");

function git(repo, ...args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function fixture() {
  const repo = mkdtempSync(path.join(tmpdir(), "antigravity-sync-"));
  git(repo, "init");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "user.email", "test@example.com");
  const skill = path.join(repo, "skills", "engineering", "tdd");
  mkdirSync(skill, { recursive: true });
  writeFileSync(path.join(skill, "SKILL.md"), "---\nname: tdd\ndescription: First.\n---\n");
  writeFileSync(path.join(skill, "run.sh"), "echo first\n");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "before");
  return { repo, cleanup: () => rmSync(repo, { recursive: true, force: true }) };
}

function classify(repo, before, after) {
  return spawnSync(process.execPath, [classifier, "--repo-root", repo, "--before", before, "--after", after], { encoding: "utf8" });
}

test("content-only upstream edits are eligible for automatic merge", () => {
  const item = fixture();
  try {
    const before = git(item.repo, "rev-parse", "HEAD");
    writeFileSync(path.join(item.repo, "skills", "engineering", "tdd", "SKILL.md"), "---\nname: tdd\ndescription: Improved.\n---\n");
    git(item.repo, "add", ".");
    git(item.repo, "commit", "-m", "content");
    const result = classify(item.repo, before, "HEAD");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /structural=false/);
    assert.match(result.stdout, /blocked=false/);
  } finally { item.cleanup(); }
});

test("skill inventory changes require manual review", () => {
  const item = fixture();
  try {
    const before = git(item.repo, "rev-parse", "HEAD");
    const added = path.join(item.repo, "skills", "engineering", "research");
    mkdirSync(added, { recursive: true });
    writeFileSync(path.join(added, "SKILL.md"), "---\nname: research\ndescription: Research.\n---\n");
    git(item.repo, "add", ".");
    git(item.repo, "commit", "-m", "structural");
    const result = classify(item.repo, before, "HEAD");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /structural=true/);
    assert.match(result.stdout, /blocked=false/);
  } finally { item.cleanup(); }
});

test("executable changes inside an existing skill require manual review", () => {
  const item = fixture();
  try {
    const before = git(item.repo, "rev-parse", "HEAD");
    writeFileSync(path.join(item.repo, "skills", "engineering", "tdd", "run.sh"), "echo changed\n");
    git(item.repo, "add", ".");
    git(item.repo, "commit", "-m", "script");
    const result = classify(item.repo, before, "HEAD");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /structural=true/);
    assert.match(result.stdout, /blocked=false/);
  } finally { item.cleanup(); }
});

test("upstream edits to fork-owned paths are blocked", () => {
  const item = fixture();
  try {
    const before = git(item.repo, "rev-parse", "HEAD");
    mkdirSync(path.join(item.repo, "skills", "security"), { recursive: true });
    writeFileSync(path.join(item.repo, "skills", "security", "intrusion.md"), "collision\n");
    git(item.repo, "add", ".");
    git(item.repo, "commit", "-m", "collision");
    const result = classify(item.repo, before, "HEAD");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /blocked=true/);
  } finally { item.cleanup(); }
});

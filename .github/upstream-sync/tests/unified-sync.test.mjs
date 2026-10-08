import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applySnapshot, commitSnapshot, fetchSnapshot, selectSources, sourceById } from "../../skill-sync/sync.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function write(root, relative, content) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function git(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
}

function init(repo) {
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "--quiet");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "user.email", "test@example.com");
}

function commit(repo) {
  git(repo, "add", ".");
  git(repo, "commit", "--quiet", "-m", "fixture");
  return git(repo, "rev-parse", "HEAD");
}

function fixture(id = "emil-skills") {
  const root = mkdtempSync(path.join(tmpdir(), "unified-skill-sync-"));
  const remote = path.join(root, "remote");
  const repo = path.join(root, "repo");
  const snapshot = path.join(root, "snapshot");
  init(remote);
  write(remote, "LICENSE", "MIT\n");
  write(remote, "skills/prototype/SKILL.md", "---\nname: prototype\ndescription: UI variants.\ndisable-model-invocation: true\n---\n");
  write(remote, "skills/prototype/PICKER.md", "picker\n");
  const sha = commit(remote);
  init(repo);
  const source = { ...sourceById(id), repository: remote, branch: "HEAD" };
  for (const relative of new Set([
    source.adapter,
    ".github/emil-skills-sync/lib.mjs",
    ".github/upstream-sync/lib/snapshot.mjs",
    ".github/upstream-sync/lib/policy.mjs",
    ".github/upstream-sync/ownership.json",
    ".github/upstream-sync/classify-sync.mjs",
  ])) {
    const destination = path.join(repo, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(repoRoot, relative), destination);
  }
  write(repo, source.lock, `${JSON.stringify({ repository: source.repository, commit: "0".repeat(40), files: [] })}\n`);
  write(repo, "skills/engineering/prototype/SKILL.md", "---\nname: prototype\ndescription: Engineering prototype.\n---\n");
  commit(repo);
  return { root, repo, remote, snapshot, source, sha };
}

test("unified selection covers every source and supports manual single-source runs", () => {
  assert.deepEqual(selectSources(), ["upstream", "security-audit", "i-have-adhd", "taiwan-terminology", "emil-skills"]);
  assert.equal(selectSources("all").length, 5);
  assert.deepEqual(selectSources("taiwan-terminology"), ["taiwan-terminology"]);
  assert.throws(() => selectSources("unknown"), /Unknown synchronization source/);
  assert.throws(() => sourceById("toString"), /Unknown synchronization source/);
});

test("an unchanged source stops before creating a snapshot or changing tracked files", () => {
  const item = fixture();
  try {
    write(item.repo, item.source.lock, `${JSON.stringify({ commit: item.sha })}\n`);
    commit(item.repo);
    const before = git(item.repo, "status", "--porcelain");
    const result = fetchSnapshot(item.repo, item.source, item.snapshot);
    assert.equal(result.changed, "false");
    assert.equal(result.sha, item.sha);
    assert.equal(existsSync(item.snapshot), false);
    assert.equal(git(item.repo, "status", "--porcelain"), before);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("a changed source fetches, applies its real adapter, and commits its own lock", () => {
  const item = fixture();
  try {
    const result = fetchSnapshot(item.repo, item.source, item.snapshot);
    assert.equal(result.changed, "true");
    assert.equal(readFileSync(path.join(item.snapshot, "skills/prototype/PICKER.md"), "utf8"), "picker\n");
    applySnapshot(item.repo, item.source, item.snapshot, result.sha);
    assert.match(readFileSync(path.join(item.repo, "skills/design/ui-prototype/SKILL.md"), "utf8"), /name: ui-prototype/);
    const lock = JSON.parse(readFileSync(path.join(item.repo, item.source.lock), "utf8"));
    assert.equal(lock.commit, item.sha);
    const committed = commitSnapshot(item.repo, item.source);
    assert.equal(committed.branch, `sync/emil-skills-${item.sha.slice(0, 12)}`);
    assert.equal(committed.blocked, "false");
    assert.equal(git(item.repo, "branch", "--show-current"), committed.branch);
    assert.equal(git(item.repo, "status", "--porcelain"), "");
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("snapshot archive preserves Git blob bytes with Windows newline settings", () => {
  const item = fixture();
  try {
    write(item.remote, "skills/prototype/CRLF.md", "original\r\n");
    write(item.remote, "skills/prototype/data.bin", Buffer.from([0, 13, 10, 128, 255]));
    git(item.remote, "-c", "core.autocrlf=false", "add", "skills/prototype/CRLF.md", "skills/prototype/data.bin");
    git(item.remote, "commit", "--quiet", "-m", "mixed newline and binary fixtures");
    git(item.repo, "config", "core.autocrlf", "true");
    git(item.repo, "config", "core.eol", "crlf");
    const result = fetchSnapshot(item.repo, item.source, item.snapshot);
    assert.equal(result.sha, git(item.remote, "rev-parse", "HEAD"));
    for (const relative of ["LICENSE", "skills/prototype/PICKER.md", "skills/prototype/CRLF.md", "skills/prototype/data.bin"]) {
      const original = execFileSync("git", ["-C", item.remote, "show", `HEAD:${relative}`]);
      assert.deepEqual(readFileSync(path.join(item.snapshot, relative)), original, relative);
    }
    assert.equal(git(item.repo, "config", "core.autocrlf"), "true");
    assert.equal(git(item.repo, "config", "core.eol"), "crlf");
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("snapshot scanning rejects symlink Git entries before extraction", () => {
  const item = fixture();
  try {
    const blob = execFileSync("git", ["-C", item.remote, "hash-object", "-w", "--stdin"], { input: "outside", encoding: "utf8" }).trim();
    git(item.remote, "update-index", "--add", "--cacheinfo", `120000,${blob},skills/prototype/external`);
    git(item.remote, "commit", "--quiet", "-m", "linked entry");
    assert.throws(() => fetchSnapshot(item.repo, item.source, item.snapshot), /unsupported Git entries/);
    assert.equal(existsSync(item.snapshot), false);
    assert.equal(git(item.repo, "status", "--porcelain"), "");
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

for (const blocked of [false, true]) {
  test(`primary source retains content classification and collision blocking (${blocked})`, () => {
    const item = fixture("upstream");
    try {
      const before = git(item.repo, "rev-parse", "HEAD");
      const lock = JSON.parse(readFileSync(path.join(item.repo, item.source.lock), "utf8"));
      write(item.repo, item.source.lock, `${JSON.stringify({ ...lock, commit: item.sha })}\n`);
      if (blocked) write(item.repo, "skills/design/intrusion/notes.md", "collision\n");
      else write(item.repo, "skills/engineering/prototype/SKILL.md", "---\nname: prototype\ndescription: Improved engineering prototype.\n---\n");
      const result = commitSnapshot(item.repo, item.source);
      assert.equal(result.blocked, String(blocked));
      assert.equal(result.structural, String(blocked));
      assert.equal(git(item.repo, "rev-list", "--count", `${before}..HEAD`), "1");
      assert.equal(JSON.parse(git(item.repo, "show", `HEAD:${item.source.lock}`)).commit, item.sha);
      assert.equal(git(item.repo, "status", "--porcelain"), "");
    } finally { rmSync(item.root, { recursive: true, force: true }); }
  });
}

test("primary source commits a lock-only update without creating a content commit", () => {
  const item = fixture("upstream");
  try {
    const before = git(item.repo, "rev-parse", "HEAD");
    const lock = JSON.parse(readFileSync(path.join(item.repo, item.source.lock), "utf8"));
    write(item.repo, item.source.lock, `${JSON.stringify({ ...lock, commit: item.sha })}\n`);
    const result = commitSnapshot(item.repo, item.source);
    assert.equal(result.blocked, "false");
    assert.equal(result.structural, "false");
    assert.equal(git(item.repo, "rev-list", "--count", `${before}..HEAD`), "1");
    assert.equal(git(item.repo, "diff", "--name-only", before, "HEAD"), item.source.lock);
    assert.equal(git(item.repo, "status", "--porcelain"), "");
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

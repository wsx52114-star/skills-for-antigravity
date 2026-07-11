import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const composer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "apply-upstream-snapshot.mjs");

function git(repo, ...args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

test("snapshot composition imports skills, developer docs, and license", () => {
  const root = mkdtempSync(path.join(tmpdir(), "antigravity-snapshot-"));
  try {
    const repo = path.join(root, "repo");
    const snapshot = path.join(root, "snapshot");
    mkdirSync(path.join(repo, ".github", "upstream-sync"), { recursive: true });
    mkdirSync(path.join(repo, "rules"), { recursive: true });
    mkdirSync(path.join(repo, "skills", "engineering", "removed"), { recursive: true });
    mkdirSync(path.join(repo, "skills", "security"), { recursive: true });
    writeFileSync(path.join(repo, "README.md"), "fork readme\n");
    writeFileSync(path.join(repo, "STALE.md"), "remove me\n");
    writeFileSync(path.join(repo, ".github", "upstream-sync", "local.md"), "keep control plane\n");
    writeFileSync(path.join(repo, "rules", "skills.md"), "keep runtime rules\n");
    writeFileSync(path.join(repo, "skills", "engineering", "removed", "SKILL.md"), "---\nname: removed\ndescription: Stale upstream skill.\n---\n");
    writeFileSync(path.join(repo, "skills", "security", "local.md"), "keep security\n");
    git(repo, "init");
    git(repo, "config", "user.name", "Test");
    git(repo, "config", "user.email", "test@example.com");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "before");

    mkdirSync(path.join(snapshot, "docs"), { recursive: true });
    mkdirSync(path.join(snapshot, "skills", "engineering", "tdd"), { recursive: true });
    mkdirSync(path.join(snapshot, "skills", "deprecated", "old-skill"), { recursive: true });
    mkdirSync(path.join(snapshot, "skills", "in-progress", "claude-handoff"), { recursive: true });
    writeFileSync(path.join(snapshot, "README.md"), "upstream readme\n");
    writeFileSync(path.join(snapshot, "docs", "NEW.md"), "new file\n");
    writeFileSync(path.join(snapshot, "docs", "README.md"), "Keep ./deprecated/example in developer docs.\n");
    writeFileSync(path.join(snapshot, "skills", "engineering", "tdd", "SKILL.md"), "---\nname: tdd\ndescription: Test.\n---\n");
    writeFileSync(path.join(snapshot, "skills", "engineering", "tdd", "README.md"), "Keep ./deprecated/example in skill docs.\n");
    writeFileSync(path.join(snapshot, "skills", "deprecated", "old-skill", "SKILL.md"), "---\nname: old-skill\ndescription: Deprecated.\n---\n");
    writeFileSync(path.join(snapshot, "skills", "in-progress", "claude-handoff", "SKILL.md"), "---\nname: claude-handoff\ndescription: Claude only.\n---\n");
    writeFileSync(path.join(snapshot, "skills", "in-progress", "README.md"), "- [claude-handoff](./claude-handoff/SKILL.md)\n- [wizard](./wizard/SKILL.md)\n");
    writeFileSync(path.join(snapshot, "LICENSE"), "MIT\n");

    const result = spawnSync(process.execPath, [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", "abc123"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(path.join(repo, "README.md"), "utf8"), "fork readme\n");
    assert.equal(readFileSync(path.join(repo, "docs", "NEW.md"), "utf8"), "new file\n");
    assert.equal(readFileSync(path.join(repo, "docs", "README.md"), "utf8"), "Keep ./deprecated/example in developer docs.\n");
    assert.equal(existsSync(path.join(repo, "skills", "engineering", "tdd", "SKILL.md")), true);
    assert.equal(readFileSync(path.join(repo, "skills", "engineering", "tdd", "README.md"), "utf8"), "Keep ./deprecated/example in skill docs.\n");
    assert.equal(existsSync(path.join(repo, "skills", "in-progress", "claude-handoff", "SKILL.md")), false);
    assert.equal(readFileSync(path.join(repo, "skills", "in-progress", "README.md"), "utf8"), "- [wizard](./wizard/SKILL.md)\n");
    assert.equal(existsSync(path.join(repo, "skills", "deprecated", "old-skill", "SKILL.md")), false);
    assert.equal(readFileSync(path.join(repo, "LICENSE"), "utf8"), "MIT\n");
    assert.equal(readFileSync(path.join(repo, ".github", "upstream-sync", "local.md"), "utf8"), "keep control plane\n");
    assert.equal(readFileSync(path.join(repo, "rules", "skills.md"), "utf8"), "keep runtime rules\n");
    assert.equal(readFileSync(path.join(repo, "skills", "security", "local.md"), "utf8"), "keep security\n");
    assert.equal(existsSync(path.join(repo, "STALE.md")), true);
    assert.equal(existsSync(path.join(repo, "skills", "engineering", "removed", "SKILL.md")), false);
    assert.equal(existsSync(path.join(repo, ".github", "upstream-sync", "upstream-lock.json")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("upstream adapter path collisions are rejected", () => {
  const root = mkdtempSync(path.join(tmpdir(), "antigravity-collision-snapshot-"));
  try {
    const repo = path.join(root, "repo");
    const snapshot = path.join(root, "snapshot");
    mkdirSync(path.join(repo, ".github", "upstream-sync"), { recursive: true });
    mkdirSync(path.join(snapshot, ".github", "upstream-sync"), { recursive: true });
    mkdirSync(path.join(snapshot, "skills", "engineering", "tdd"), { recursive: true });
    writeFileSync(path.join(repo, "KEEP.md"), "keep me\n");
    writeFileSync(path.join(snapshot, ".github", "upstream-sync", "intrusion.md"), "collision\n");
    writeFileSync(path.join(snapshot, "skills", "engineering", "tdd", "SKILL.md"), "---\nname: tdd\ndescription: Test.\n---\n");
    writeFileSync(path.join(snapshot, "LICENSE"), "MIT\n");
    git(repo, "init");
    git(repo, "config", "user.name", "Test");
    git(repo, "config", "user.email", "test@example.com");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "before");

    const result = spawnSync(process.execPath, [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", "collision"], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /collides with fork-owned paths/);
    assert.equal(readFileSync(path.join(repo, "KEEP.md"), "utf8"), "keep me\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("empty or invalid upstream snapshots are rejected without deleting files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "antigravity-empty-snapshot-"));
  try {
    const repo = path.join(root, "repo");
    const snapshot = path.join(root, "snapshot");
    mkdirSync(path.join(repo, ".github", "upstream-sync"), { recursive: true });
    mkdirSync(snapshot, { recursive: true });
    writeFileSync(path.join(repo, "KEEP.md"), "keep me\n");
    git(repo, "init");
    git(repo, "config", "user.name", "Test");
    git(repo, "config", "user.email", "test@example.com");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "before");

    const result = spawnSync(process.execPath, [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", "missing"], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Invalid upstream snapshot/);
    assert.equal(readFileSync(path.join(repo, "KEEP.md"), "utf8"), "keep me\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

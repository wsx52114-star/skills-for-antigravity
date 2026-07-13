import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const composer = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "security-audit-sync",
  "apply-upstream-snapshot.mjs",
);
const commit = "b".repeat(40);

function git(repo, ...args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function createRepository(root) {
  const repo = path.join(root, "repo");
  const destination = path.join(repo, "skills", "security", "security-audit");
  mkdirSync(path.join(repo, ".github", "security-audit-sync"), { recursive: true });
  mkdirSync(destination, { recursive: true });
  writeFileSync(path.join(destination, "STALE.md"), "remove me\n");
  git(repo, "init");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "before");
  return repo;
}

function createSnapshot(root) {
  const snapshot = path.join(root, "snapshot");
  const skill = path.join(snapshot, "skills", "security-audit");
  mkdirSync(skill, { recursive: true });
  writeFileSync(path.join(snapshot, "LICENSE"), "MIT\n");
  writeFileSync(path.join(skill, "SKILL.md"), "---\nname: security-audit\ndescription: Audit.\n---\n");
  writeFileSync(path.join(skill, "ATTACK-CLASSES.md"), "# Attacks\n");
  return snapshot;
}

test("Cloudflare composition replaces only the managed skill and records its inventory", () => {
  const root = mkdtempSync(path.join(tmpdir(), "security-audit-sync-"));
  try {
    const repo = createRepository(root);
    const snapshot = createSnapshot(root);
    const result = spawnSync(
      process.execPath,
      [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", commit],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    const destination = path.join(repo, "skills", "security", "security-audit");
    assert.equal(existsSync(path.join(destination, "STALE.md")), false);
    assert.equal(readFileSync(path.join(destination, "LICENSE"), "utf8"), "MIT\n");
    assert.equal(readFileSync(path.join(destination, "ATTACK-CLASSES.md"), "utf8"), "# Attacks\n");

    const lock = JSON.parse(
      readFileSync(path.join(repo, ".github", "security-audit-sync", "upstream-lock.json"), "utf8"),
    );
    assert.equal(lock.repository, "https://github.com/cloudflare/security-audit-skill");
    assert.equal(lock.commit, commit);
    assert.deepEqual(lock.files, [
      "LICENSE",
      "skills/security-audit/ATTACK-CLASSES.md",
      "skills/security-audit/SKILL.md",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an incomplete Cloudflare snapshot is rejected before managed files change", () => {
  const root = mkdtempSync(path.join(tmpdir(), "security-audit-incomplete-"));
  try {
    const repo = createRepository(root);
    const snapshot = createSnapshot(root);
    rmSync(path.join(snapshot, "LICENSE"));
    const result = spawnSync(
      process.execPath,
      [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", commit],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 2);
    assert.match(result.stderr, /root LICENSE is required/);
    assert.equal(
      readFileSync(path.join(repo, "skills", "security", "security-audit", "STALE.md"), "utf8"),
      "remove me\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test(
  "a Cloudflare snapshot containing symlinks is rejected",
  { skip: process.platform === "win32" },
  () => {
    const root = mkdtempSync(path.join(tmpdir(), "security-audit-symlink-"));
    try {
      const repo = createRepository(root);
      const snapshot = createSnapshot(root);
      symlinkSync("SKILL.md", path.join(snapshot, "skills", "security-audit", "LINK.md"));
      const result = spawnSync(
        process.execPath,
        [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", commit],
        { encoding: "utf8" },
      );

      assert.equal(result.status, 2);
      assert.match(result.stderr, /forbidden symlink/);
      assert.equal(
        readFileSync(path.join(repo, "skills", "security", "security-audit", "STALE.md"), "utf8"),
        "remove me\n",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);

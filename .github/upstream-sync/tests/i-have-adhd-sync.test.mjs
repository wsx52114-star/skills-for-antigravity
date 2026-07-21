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

const composer = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "i-have-adhd-sync",
  "apply-upstream-snapshot.mjs",
);
const commit = "c".repeat(40);

function git(repo, ...args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

test("i-have-adhd composition installs an explicitly invoked skill and records its source", () => {
  const root = mkdtempSync(path.join(tmpdir(), "i-have-adhd-sync-"));
  try {
    const repo = path.join(root, "repo");
    const snapshot = path.join(root, "snapshot");
    const destination = path.join(repo, "skills", "productivity", "i-have-adhd");
    const upstreamSkill = path.join(snapshot, "skills", "i-have-adhd");
    mkdirSync(path.join(repo, ".github", "i-have-adhd-sync"), { recursive: true });
    mkdirSync(destination, { recursive: true });
    mkdirSync(path.join(upstreamSkill, "agents"), { recursive: true });
    writeFileSync(path.join(destination, "STALE.md"), "remove me\n");
    writeFileSync(path.join(snapshot, "LICENSE"), "MIT\n");
    writeFileSync(
      path.join(upstreamSkill, "SKILL.md"),
      "---\nname: i-have-adhd\ndescription: Action-first output.\n---\n\n# Skill\n",
    );
    writeFileSync(
      path.join(upstreamSkill, "agents", "openai.yaml"),
      "policy:\n  allow_implicit_invocation: true\n",
    );
    git(repo, "init");
    git(repo, "config", "user.name", "Test");
    git(repo, "config", "user.email", "test@example.com");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "before");

    const result = spawnSync(
      process.execPath,
      [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", commit],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(path.join(destination, "STALE.md")), false);
    assert.equal(readFileSync(path.join(destination, "LICENSE"), "utf8"), "MIT\n");
    assert.match(
      readFileSync(path.join(destination, "SKILL.md"), "utf8"),
      /^---\nname: i-have-adhd\ndescription: Action-first output\.\ndisable-model-invocation: true\n---/,
    );
    assert.match(
      readFileSync(path.join(destination, "agents", "openai.yaml"), "utf8"),
      /allow_implicit_invocation: false/,
    );

    const lock = JSON.parse(
      readFileSync(path.join(repo, ".github", "i-have-adhd-sync", "upstream-lock.json"), "utf8"),
    );
    assert.equal(lock.repository, "https://github.com/ayghri/i-have-adhd");
    assert.equal(lock.commit, commit);
    assert.deepEqual(lock.files, [
      "LICENSE",
      "skills/i-have-adhd/SKILL.md",
      "skills/i-have-adhd/agents/openai.yaml",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

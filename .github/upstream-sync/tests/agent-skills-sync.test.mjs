import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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
  "agent-skills-sync",
  "apply-upstream-snapshot.mjs",
);
const commit = "d".repeat(40);

function write(root, relative, content) {
  const destination = path.join(root, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function git(repo, ...args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "agent-skills-sync-"));
  const repo = path.join(root, "repo");
  const snapshot = path.join(root, "snapshot");
  const selection = {
    repository: "https://github.com/addyosmani/agent-skills",
    skills: ["alpha-workflow", "beta-workflow"],
  };
  write(repo, ".github/agent-skills-sync/selection.json", `${JSON.stringify(selection)}\n`);
  write(repo, "skills/addyosmani-pack/skills/alpha-workflow/STALE.md", "remove me\n");
  write(snapshot, "LICENSE", "MIT\n");
  write(snapshot, "references/definition-of-done.md", "# Done\n");
  for (const name of [...selection.skills, "not-selected"]) {
    write(snapshot, `skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Test.\n---\n`);
  }
  git(repo, "init");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "before");
  return { root, repo, snapshot };
}

test("Addy composition installs only selected skills, shared references, and source metadata", () => {
  const { root, repo, snapshot } = fixture();
  try {
    const result = spawnSync(
      process.execPath,
      [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", commit],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);

    const destination = path.join(repo, "skills", "addyosmani-pack");
    assert.equal(existsSync(path.join(destination, "skills", "alpha-workflow", "STALE.md")), false);
    assert.equal(existsSync(path.join(destination, "skills", "alpha-workflow", "SKILL.md")), true);
    assert.equal(existsSync(path.join(destination, "skills", "beta-workflow", "SKILL.md")), true);
    assert.equal(existsSync(path.join(destination, "skills", "not-selected", "SKILL.md")), false);
    assert.equal(readFileSync(path.join(destination, "references", "definition-of-done.md"), "utf8"), "# Done\n");

    const lock = JSON.parse(
      readFileSync(path.join(repo, ".github", "agent-skills-sync", "upstream-lock.json"), "utf8"),
    );
    assert.equal(lock.repository, selectionRepository(repo));
    assert.equal(lock.commit, commit);
    assert.deepEqual(lock.skills, ["alpha-workflow", "beta-workflow"]);
    assert.deepEqual(lock.files, [
      "LICENSE",
      "references/definition-of-done.md",
      "skills/alpha-workflow/SKILL.md",
      "skills/beta-workflow/SKILL.md",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Addy composition rejects symlinks before replacing managed files", { skip: process.platform === "win32" }, () => {
  const { root, repo, snapshot } = fixture();
  try {
    symlinkSync("definition-of-done.md", path.join(snapshot, "references", "LINK.md"));
    const result = spawnSync(
      process.execPath,
      [composer, "--repo-root", repo, "--snapshot-root", snapshot, "--sha", commit],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /forbidden symlink/);
    assert.equal(
      readFileSync(path.join(repo, "skills", "addyosmani-pack", "skills", "alpha-workflow", "STALE.md"), "utf8"),
      "remove me\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function selectionRepository(repo) {
  return JSON.parse(
    readFileSync(path.join(repo, ".github", "agent-skills-sync", "selection.json"), "utf8"),
  ).repository;
}

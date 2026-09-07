import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const github = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adapters = [
  ["upstream-sync", "skills/engineering/demo"],
  ["security-audit-sync", "skills/security-audit"],
  ["i-have-adhd-sync", "skills/i-have-adhd"],
];

for (const [adapter, skill] of adapters) {
  for (const invalid of ["short SHA", "linked directory"]) {
    test(`${adapter} rejects ${invalid} before changing the repository`, () => {
      const root = mkdtempSync(path.join(tmpdir(), "antigravity-input-"));
      try {
        const repo = path.join(root, "repo");
        const source = path.join(root, "snapshot");
        mkdirSync(path.join(repo, ".github", adapter), { recursive: true });
        mkdirSync(path.join(source, skill), { recursive: true });
        writeFileSync(path.join(repo, "KEEP.md"), "keep\n");
        writeFileSync(path.join(source, "LICENSE"), "license\n");
        writeFileSync(path.join(source, skill, "SKILL.md"), "---\nname: demo\ndescription: Demo\n---\n");
        assert.equal(spawnSync("git", ["-C", repo, "init", "--quiet"]).status, 0);
        assert.equal(spawnSync("git", ["-C", repo, "add", "."]).status, 0);
        const before = spawnSync("git", ["-C", repo, "status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" }).stdout;
        if (invalid === "linked directory") {
          const outside = path.join(root, "outside");
          mkdirSync(outside);
          writeFileSync(path.join(outside, "private.txt"), "outside\n");
          symlinkSync(outside, path.join(source, skill, "external"), process.platform === "win32" ? "junction" : "dir");
        }
        const result = spawnSync(process.execPath, [
          path.join(github, adapter, "apply-upstream-snapshot.mjs"),
          "--repo-root", repo, "--snapshot-root", source,
          "--sha", invalid === "short SHA" ? "abc123" : "a".repeat(40),
        ], { encoding: "utf8" });
        assert.equal(result.status, 2, result.stdout + result.stderr);
        assert.match(result.stderr, invalid === "short SHA" ? /full lowercase commit SHA/ : /symlink/);
        assert.equal(readFileSync(path.join(repo, "KEEP.md"), "utf8"), "keep\n");
        const after = spawnSync("git", ["-C", repo, "status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" }).stdout;
        assert.equal(after, before, "Rejected input changed repository files");
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  }
}

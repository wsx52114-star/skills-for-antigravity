import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const skillRoot = path.join(repoRoot, "skills", "language", "taiwan-term");
const builder = path.join(skillRoot, "scripts", "build_snapshot.py");
const scanner = path.join(skillRoot, "scripts", "audit_terms.py");
const composer = path.join(
  repoRoot,
  ".github",
  "taiwan-terminology-sync",
  "apply_upstream_snapshot.py",
);
const commit = "d".repeat(40);

function sourceFixture(root) {
  const source = path.join(root, "source");
  const terms = path.join(source, "data", "terminology");
  mkdirSync(terms, { recursive: true });
  writeFileSync(path.join(source, "README.md"), "# Taiwan.md\n");
  writeFileSync(
    path.join(terms, "演算法.yaml"),
    "fork_type: B\ndisplay:\n  taiwan: 演算法\n  china: 算法\ndetection:\n  severity: B\n  false_positives:\n    - pattern: 演算法\n      note: 合法子字串\n",
  );
  writeFileSync(
    path.join(terms, "串列埠.yaml"),
    "fork_type: semantic\ndisplay:\n  taiwan: 串列埠\n  china: 串口\n",
  );
  writeFileSync(
    path.join(terms, "無對應詞.yaml"),
    "fork_type: B\ndisplay:\n  taiwan: 無對應詞\n  china: {}\n",
  );
  return source;
}

function runPython(script, args, cwd) {
  return spawnSync("python3", [script, ...args], { cwd, encoding: "utf8" });
}

test("snapshot and scanner preserve conservative and full review modes", () => {
  const root = mkdtempSync(path.join(tmpdir(), "taiwan-terminology-"));
  try {
    const source = sourceFixture(root);
    const snapshot = path.join(root, "snapshot.json");
    const project = path.join(root, "project");
    mkdirSync(project);
    spawnSync("git", ["init"], { cwd: project });
    writeFileSync(path.join(project, "doc.md"), "算法與演算法，另有串口。\n");
    spawnSync("git", ["add", "doc.md"], { cwd: project });

    const build = runPython(
      builder,
      ["--source-root", source, "--revision", commit, "--output", snapshot],
      root,
    );
    assert.equal(build.status, 0, build.stderr);

    const detection = runPython(
      scanner,
      ["--repo", project, "--snapshot", snapshot, "--mode", "detection", "--format", "json"],
      project,
    );
    assert.equal(detection.status, 0, detection.stderr);
    assert.deepEqual(JSON.parse(detection.stdout).findings.map((item) => item.term), ["算法"]);

    const full = runPython(
      scanner,
      ["--repo", project, "--snapshot", snapshot, "--mode", "full", "--format", "json"],
      project,
    );
    assert.equal(full.status, 0, full.stderr);
    assert.deepEqual(JSON.parse(full.stdout).findings.map((item) => item.term).sort(), ["串口", "算法"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("composer records a reproducible snapshot and lock", () => {
  const root = mkdtempSync(path.join(tmpdir(), "taiwan-terminology-sync-"));
  try {
    const source = sourceFixture(root);
    const repo = path.join(root, "repo");
    const fixtureSkill = path.join(repo, "skills", "language", "taiwan-term");
    mkdirSync(path.join(fixtureSkill, "scripts"), { recursive: true });
    mkdirSync(path.join(repo, ".github", "taiwan-terminology-sync"), { recursive: true });
    copyFileSync(builder, path.join(fixtureSkill, "scripts", "build_snapshot.py"));

    const result = runPython(
      composer,
      [
        "--repo-root",
        repo,
        "--snapshot-root",
        source,
        "--sha",
        commit,
        "--synced-at",
        "2026-08-14T00:00:00+00:00",
      ],
      root,
    );
    assert.equal(result.status, 0, result.stderr);

    const lock = JSON.parse(
      readFileSync(path.join(repo, ".github", "taiwan-terminology-sync", "upstream-lock.json"), "utf8"),
    );
    const metadata = JSON.parse(
      readFileSync(
        path.join(fixtureSkill, "references", "taiwan-md", "UPSTREAM.json"),
        "utf8",
      ),
    );
    assert.equal(lock.commit, commit);
    assert.equal(lock.terms, 2);
    assert.equal(lock.severity_b, 1);
    assert.equal(lock.snapshot_sha256, metadata.snapshot_sha256);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

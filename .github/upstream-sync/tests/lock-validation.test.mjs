import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const validator = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "validate.mjs");

function write(root, relative, content = "placeholder\n") {
  const destination = path.join(root, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function fixture(lock) {
  const root = mkdtempSync(path.join(tmpdir(), "antigravity-lock-"));
  const policy = {
    upstream: "https://github.com/mattpocock/skills",
    upstreamAllowlist: ["skills/", "docs/", "LICENSE"],
    blockedUpstreamPaths: ["skills/security/"],
    excludedSkillNames: ["claude-handoff"],
    excludedSkillPathSegments: ["deprecated"],
    forkOwned: ["skills/security/"],
  };
  write(root, ".github/upstream-sync/ownership.json", `${JSON.stringify(policy)}\n`);
  write(root, ".github/upstream-sync/upstream-lock.json", `${JSON.stringify(lock)}\n`);
  for (const required of [
    ".github/upstream-sync/apply-upstream-snapshot.mjs",
    ".github/upstream-sync/lib/policy.mjs",
    "rules/skills.md",
    "skills/security/README.md",
    "skills/security/security-audit/report-schema.json",
    "MAINTENANCE.md",
    ".github/workflows/sync-upstream.yml",
    ".github/workflows/validate-antigravity.yml",
  ]) write(root, required, required.endsWith(".json") ? "{}\n" : undefined);
  write(root, "skills/security/security-audit/SKILL.md", "---\nname: security-audit\ndescription: Audit.\n---\n");
  write(root, "skills/engineering/tdd/SKILL.md", "---\nname: tdd\ndescription: Test.\n---\n");
  write(root, "LICENSE", "MIT\n");
  return root;
}

test("validator rejects a lock whose inventory does not match the composed upstream files", () => {
  const root = fixture({
    repository: "https://github.com/mattpocock/skills",
    commit: "a".repeat(40),
    files: [],
  });
  try {
    const result = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /inventory does not match/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validator rejects invalid lock metadata and ordering", () => {
  const root = fixture({
    repository: "https://example.com/wrong",
    commit: "short",
    files: ["skills/engineering/tdd/SKILL.md", "LICENSE", "LICENSE"],
  });
  try {
    const result = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /repository does not match policy/);
    assert.match(result.stderr, /full lowercase commit SHA/);
    assert.match(result.stderr, /sorted and unique/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validator rejects category indexes that reference excluded skills", () => {
  const root = fixture({
    repository: "https://github.com/mattpocock/skills",
    commit: "a".repeat(40),
    files: ["LICENSE", "skills/engineering/README.md", "skills/engineering/tdd/SKILL.md"],
  });
  write(root, "skills/engineering/README.md", "- [claude-handoff](./claude-handoff/SKILL.md)\n");
  try {
    const result = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /references an excluded path/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validator rejects excluded skill paths even when they contain no SKILL.md", () => {
  const root = fixture({
    repository: "https://github.com/mattpocock/skills",
    commit: "a".repeat(40),
    files: ["LICENSE", "skills/deprecated/payload.sh", "skills/engineering/tdd/SKILL.md"],
  });
  write(root, "skills/deprecated/payload.sh", "echo unsafe\n");
  try {
    const result = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Non-runtime excluded path is present/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

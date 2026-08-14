import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
    blockedUpstreamPaths: [
      ".github/taiwan-terminology-sync/",
      "skills/language/",
      "skills/security/",
      "skills/productivity/i-have-adhd/",
    ],
    excludedSkillNames: ["claude-handoff"],
    excludedSkillPathSegments: ["deprecated"],
    forkOwned: [
      ".github/taiwan-terminology-sync/",
      "skills/language/",
      "skills/security/",
      "skills/productivity/i-have-adhd/",
    ],
  };
  write(root, ".github/upstream-sync/ownership.json", `${JSON.stringify(policy)}\n`);
  write(root, ".github/upstream-sync/upstream-lock.json", `${JSON.stringify(lock)}\n`);
  write(
    root,
    ".github/security-audit-sync/upstream-lock.json",
    `${JSON.stringify({
      repository: "https://github.com/cloudflare/security-audit-skill",
      commit: "b".repeat(40),
      files: [
        "LICENSE",
        "skills/security-audit/SKILL.md",
        "skills/security-audit/report-schema.json",
      ],
    })}\n`,
  );
  write(
    root,
    ".github/i-have-adhd-sync/upstream-lock.json",
    `${JSON.stringify({
      repository: "https://github.com/ayghri/i-have-adhd",
      commit: "c".repeat(40),
      files: ["LICENSE", "skills/i-have-adhd/SKILL.md", "skills/i-have-adhd/agents/openai.yaml"],
    })}\n`,
  );
  const terminologyCommit = "d".repeat(40);
  const terminologySnapshot = `${JSON.stringify({
    schema_version: 1,
    source: {
      repository: "https://github.com/frank890417/taiwan-md",
      commit: terminologyCommit,
    },
    statistics: { terms: 1, severity_a: 0, severity_b: 0 },
    terms: [
      {
        china: ["串口"],
        taiwan: ["串列埠"],
        fork_type: "semantic",
        detection: null,
        source_file: "串口.yaml",
      },
    ],
  })}\n`;
  const terminologyDigest = createHash("sha256").update(terminologySnapshot).digest("hex");
  const terminologyMetadata = {
    repository: "https://github.com/frank890417/taiwan-md",
    commit: terminologyCommit,
    source_paths: ["README.md", "data/terminology/*.yaml"],
    snapshot: "terminology.snapshot.json",
    snapshot_sha256: terminologyDigest,
    terms: 1,
    severity_a: 0,
    severity_b: 0,
  };
  write(
    root,
    ".github/taiwan-terminology-sync/upstream-lock.json",
    `${JSON.stringify({ ...terminologyMetadata, syncedAt: "2026-08-14T00:00:00Z" })}\n`,
  );
  write(
    root,
    "skills/language/taiwan-term/references/taiwan-md/UPSTREAM.json",
    `${JSON.stringify(terminologyMetadata)}\n`,
  );
  write(
    root,
    "skills/language/taiwan-term/references/taiwan-md/terminology.snapshot.json",
    terminologySnapshot,
  );
  for (const required of [
    ".github/upstream-sync/apply-upstream-snapshot.mjs",
    ".github/upstream-sync/lib/policy.mjs",
    ".github/security-audit-sync/apply-upstream-snapshot.mjs",
    ".github/i-have-adhd-sync/apply-upstream-snapshot.mjs",
    ".github/taiwan-terminology-sync/apply_upstream_snapshot.py",
    "rules/skills.md",
    "skills/security/README.md",
    "skills/security/security-audit/LICENSE",
    "skills/security/security-audit/report-schema.json",
    "skills/language/taiwan-term/agents/openai.yaml",
    "skills/language/taiwan-term/scripts/audit_terms.py",
    "skills/language/taiwan-term/scripts/build_snapshot.py",
    "skills/language/taiwan-term/references/taiwan-md/NOTICE.md",
    "MAINTENANCE.md",
    ".github/workflows/sync-security-audit.yml",
    ".github/workflows/sync-i-have-adhd.yml",
    ".github/workflows/sync-taiwan-terminology.yml",
    ".github/workflows/sync-upstream.yml",
    ".github/workflows/validate-antigravity.yml",
  ]) write(root, required, required.endsWith(".json") ? "{}\n" : undefined);
  write(root, "skills/security/security-audit/SKILL.md", "---\nname: security-audit\ndescription: Audit.\n---\n");
  write(root, "skills/productivity/i-have-adhd/LICENSE", "MIT\n");
  write(root, "skills/productivity/i-have-adhd/SKILL.md", "---\nname: i-have-adhd\ndescription: Focus.\ndisable-model-invocation: true\n---\n");
  write(root, "skills/productivity/i-have-adhd/agents/openai.yaml", "policy:\n  allow_implicit_invocation: false\n");
  write(root, "skills/language/taiwan-term/SKILL.md", "---\nname: taiwan-term\ndescription: Audit Taiwan terminology.\n---\n");
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

test("validator rejects a Cloudflare lock whose inventory does not match the installed skill", () => {
  const root = fixture({
    repository: "https://github.com/mattpocock/skills",
    commit: "a".repeat(40),
    files: ["LICENSE", "skills/engineering/tdd/SKILL.md"],
  });
  write(
    root,
    ".github/security-audit-sync/upstream-lock.json",
    `${JSON.stringify({
      repository: "https://github.com/cloudflare/security-audit-skill",
      commit: "b".repeat(40),
      files: [],
    })}\n`,
  );
  try {
    const result = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Security-audit lock inventory does not match/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validator rejects implicit invocation for i-have-adhd", () => {
  const root = fixture({
    repository: "https://github.com/mattpocock/skills",
    commit: "a".repeat(40),
    files: ["LICENSE", "skills/engineering/tdd/SKILL.md"],
  });
  write(root, "skills/productivity/i-have-adhd/agents/openai.yaml", "policy:\n  allow_implicit_invocation: true\n");
  try {
    const result = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /i-have-adhd must require explicit invocation/);
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

test("validator allows an empty harness directory but rejects nested runtime content", () => {
  const root = fixture({
    repository: "https://github.com/mattpocock/skills",
    commit: "a".repeat(40),
    files: ["LICENSE", "skills/engineering/tdd/SKILL.md"],
  });
  mkdirSync(path.join(root, ".agents"), { recursive: true });
  try {
    const emptyResult = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(emptyResult.status, 0, emptyResult.stderr);

    write(root, ".agents/AGENTS.md", "nested runtime\n");
    const contentResult = spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
    assert.equal(contentResult.status, 1);
    assert.match(contentResult.stderr, /forbidden nested runtime\/control directory: \.agents/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

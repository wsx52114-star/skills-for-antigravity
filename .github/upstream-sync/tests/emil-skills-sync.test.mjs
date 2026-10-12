import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const composer = path.join(repoRoot, ".github/emil-skills-sync/apply-upstream-snapshot.mjs");
const primaryComposer = path.join(repoRoot, ".github/upstream-sync/apply-upstream-snapshot.mjs");
const commit = "e".repeat(40);
const rootReadme = "# Fork overview\n\n### Design\n\n| 關鍵字 | 觸發方式 | 用途 |\n| --- | --- | --- |\n| [`animate`](skills/design/animate/SKILL.md) | 可自動選用 | Local animation summary. |\n| [`removed`](skills/design/removed/SKILL.md) | 可自動選用 | Old skill. |\n\n### Engineering\n\nfork readme\n";
const designReadme = "# Design skills\n\n## Model-invoked\n\n- [animate](./animate/SKILL.md): Local animation summary.\n- [removed](./removed/SKILL.md): Old skill.\n\n## User-invoked\n\nfork design index\n";

function write(root, relative, content) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function git(repo, ...args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "emil-skills-sync-"));
  const repo = path.join(root, "repo");
  const snapshot = path.join(root, "snapshot");
  write(repo, "README.md", rootReadme);
  write(repo, "skills/design/README.md", designReadme);
  write(repo, "skills/design/removed/SKILL.md", "old skill\n");
  write(repo, "skills/engineering/prototype/SKILL.md", "original engineering prototype\n");
  write(snapshot, "LICENSE", "MIT Emil license\n");
  write(snapshot, "skills/animate/SKILL.md", "---\nname: animate\ndescription: Animate.\n---\n\nContent unchanged.\n");
  write(snapshot, "skills/prototype/SKILL.md", "---\nname: prototype\ndescription: UI variants.\ndisable-model-invocation: true\n---\n\nWait for the user's choice.\n");
  write(snapshot, "skills/prototype/PICKER.md", "Picker reference\n");
  git(repo, "init", "--quiet");
  git(repo, "add", ".");
  return { root, repo, snapshot };
}

function apply(item, script = composer) {
  return spawnSync(process.execPath, [script, "--repo-root", item.repo, "--snapshot-root", item.snapshot, "--sha", commit], { encoding: "utf8" });
}

test("Emil composition preserves invocation, references, attribution, and the existing prototype", () => {
  const item = fixture();
  try {
    const result = apply(item);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(path.join(item.repo, "skills/design/animate/SKILL.md"), "utf8"), readFileSync(path.join(item.snapshot, "skills/animate/SKILL.md"), "utf8"));
    assert.equal(readFileSync(path.join(item.repo, "skills/design/ui-prototype/SKILL.md"), "utf8"), readFileSync(path.join(item.snapshot, "skills/prototype/SKILL.md"), "utf8").replace("name: prototype", "name: ui-prototype"));
    assert.equal(readFileSync(path.join(item.repo, "skills/design/ui-prototype/PICKER.md"), "utf8"), "Picker reference\n");
    for (const name of ["animate", "ui-prototype"]) {
      assert.equal(readFileSync(path.join(item.repo, `skills/design/${name}/LICENSE`), "utf8"), "MIT Emil license\n");
    }
    assert.equal(readFileSync(path.join(item.repo, "skills/engineering/prototype/SKILL.md"), "utf8"), "original engineering prototype\n");
    assert.match(readFileSync(path.join(item.repo, "skills/design/README.md"), "utf8"), /fork design index/);
    assert.match(readFileSync(path.join(item.repo, "README.md"), "utf8"), /fork readme/);
    assert.equal(existsSync(path.join(item.repo, "skills/design/removed/SKILL.md")), false);
    const lock = JSON.parse(readFileSync(path.join(item.repo, ".github/emil-skills-sync/upstream-lock.json"), "utf8"));
    assert.equal(lock.repository, "https://github.com/emilkowalski/skills");
    assert.equal(lock.commit, commit);
    assert.deepEqual(lock.files, ["LICENSE", "skills/animate/SKILL.md", "skills/prototype/PICKER.md", "skills/prototype/SKILL.md"]);
    assert.equal(apply(item).status, 0, "Reapplying the same snapshot failed");
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("Emil composition updates skill indexes for additions, removals, and aliases", () => {
  const item = fixture();
  try {
    write(item.repo, "README.md", "# Local overview\n\n### Engineering\n\nKeep engineering documentation.\n\n### Design\n\n| 關鍵字 | 觸發方式 | 用途 |\n| --- | --- | --- |\n| [`animate`](skills/design/animate/SKILL.md) | 可自動選用 | 保留既有動畫說明。 |\n| [`removed`](skills/design/removed/SKILL.md) | 可自動選用 | Old skill. |\n\n### Security\n\nKeep security documentation.\n");
    write(item.repo, "skills/design/README.md", "# Local design overview\n\n## Model-invoked\n\n- [animate](./animate/SKILL.md): Keep the existing animation summary.\n- [removed](./removed/SKILL.md): Old skill.\n\n## User-invoked\n\nKeep local compatibility notes.\n");
    write(item.snapshot, "skills/animation-performance/SKILL.md", "---\nname: animation-performance\ndescription: Profile animations.\n---\n");
    const result = apply(item);
    assert.equal(result.status, 0, result.stderr);
    const rootIndex = readFileSync(path.join(item.repo, "README.md"), "utf8");
    assert.match(rootIndex, /\[\x60animation-performance\x60\]\(skills\/design\/animation-performance\/SKILL\.md\)/);
    assert.match(rootIndex, /\[\x60ui-prototype\x60\]\(skills\/design\/ui-prototype\/SKILL\.md\) \| 需明確指定/);
    assert.match(rootIndex, /保留既有動畫說明。/);
    assert.match(rootIndex, /### Engineering\n\nKeep engineering documentation\./);
    assert.match(rootIndex, /### Security\n\nKeep security documentation\./);
    assert.doesNotMatch(rootIndex, /skills\/design\/removed\//);
    const designIndex = readFileSync(path.join(item.repo, "skills/design/README.md"), "utf8");
    assert.match(designIndex, /\[animation-performance\]\(\.\/animation-performance\/SKILL\.md\)/);
    assert.match(designIndex, /## User-invoked[\s\S]*\[ui-prototype\]\(\.\/ui-prototype\/SKILL\.md\)/);
    assert.match(designIndex, /Keep the existing animation summary\./);
    assert.match(designIndex, /Keep local compatibility notes\./);
    assert.doesNotMatch(designIndex, /\.\/removed\//);
    assert.equal(apply(item).status, 0);
    assert.equal(readFileSync(path.join(item.repo, "README.md"), "utf8"), rootIndex);
    assert.equal(readFileSync(path.join(item.repo, "skills/design/README.md"), "utf8"), designIndex);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("Emil indexes track invocation changes and preserve CRLF and table syntax", () => {
  const item = fixture();
  try {
    write(item.repo, "README.md", rootReadme.replaceAll("\n", "\r\n"));
    write(item.repo, "skills/design/README.md", designReadme.replaceAll("\n", "\r\n"));
    write(item.snapshot, "skills/animate/SKILL.md", "---\nname: animate\ndescription: Animate.\ndisable-model-invocation: true\n---\n");
    write(item.snapshot, "skills/animation-performance/SKILL.md", "---\nname: animation-performance\ndescription: 'Profile | improve animations.'\n---\n");
    const result = apply(item);
    assert.equal(result.status, 0, result.stderr);
    const rootIndex = readFileSync(path.join(item.repo, "README.md"), "utf8");
    assert.match(rootIndex, /\[\x60animate\x60\].*?\| 需明確指定 \| Local animation summary\./);
    assert.ok(rootIndex.includes("Profile \\| improve animations."));
    assert.doesNotMatch(rootIndex, /(?<!\r)\n/);
    const designIndex = readFileSync(path.join(item.repo, "skills/design/README.md"), "utf8");
    const modelInvoked = designIndex.split("## Model-invoked")[1].split("## User-invoked")[0];
    assert.doesNotMatch(modelInvoked, /\.\/animate\//);
    assert.match(designIndex.split("## User-invoked")[1], /\[animate\]\(\.\/animate\/SKILL\.md\)/);
    assert.doesNotMatch(designIndex, /(?<!\r)\n/);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

for (const index of ["README.md", "skills/design/README.md"]) {
  test(`Emil composition rejects malformed ${index} before changing managed files`, () => {
    const item = fixture();
    try {
      write(item.repo, index, "invalid index\n");
      const before = git(item.repo, "status", "--porcelain", "--untracked-files=all");
      const result = apply(item);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, /Skill index is missing heading/);
      assert.equal(git(item.repo, "status", "--porcelain", "--untracked-files=all"), before);
      assert.equal(readFileSync(path.join(item.repo, index), "utf8"), "invalid index\n");
      assert.equal(readFileSync(path.join(item.repo, "skills/design/removed/SKILL.md"), "utf8"), "old skill\n");
      assert.equal(existsSync(path.join(item.repo, "skills/design/animate/SKILL.md")), false);
    } finally { rmSync(item.root, { recursive: true, force: true }); }
  });
}

for (const invalid of ["invalid frontmatter", "alias collision"]) {
  test(`Emil composition rejects ${invalid} before changing any files`, () => {
    const item = fixture();
    try {
      if (invalid === "invalid frontmatter") {
        write(item.snapshot, "skills/prototype/SKILL.md", "missing frontmatter\n");
      } else {
        write(item.snapshot, "skills/ui-prototype/SKILL.md", "---\nname: ui-prototype\ndescription: Collision.\n---\n");
      }
      const before = git(item.repo, "status", "--porcelain", "--untracked-files=all");
      const result = apply(item);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, invalid === "invalid frontmatter" ? /frontmatter/ : /Duplicate Emil runtime skill/);
      assert.equal(git(item.repo, "status", "--porcelain", "--untracked-files=all"), before);
    } finally { rmSync(item.root, { recursive: true, force: true }); }
  });
}

test("primary upstream composition preserves independently managed design skills", () => {
  const item = fixture();
  try {
    rmSync(item.snapshot, { recursive: true, force: true });
    write(item.snapshot, "LICENSE", "primary license\n");
    write(item.snapshot, "skills/engineering/tdd/SKILL.md", "---\nname: tdd\ndescription: Test.\n---\n");
    mkdirSync(path.join(item.repo, ".github/upstream-sync"), { recursive: true });
    const composed = apply(item, primaryComposer);
    assert.equal(composed.status, 0, composed.stderr);
    assert.equal(readFileSync(path.join(item.repo, "skills/design/removed/SKILL.md"), "utf8"), "old skill\n");
    assert.equal(readFileSync(path.join(item.repo, "skills/design/README.md"), "utf8"), designReadme);
    write(item.snapshot, "skills/design/intrusion/SKILL.md", "collision\n");
    const result = apply(item, primaryComposer);
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /collides with fork-owned paths/);
    assert.equal(existsSync(path.join(item.repo, "skills/design/intrusion/SKILL.md")), false);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("installed design skills retain every relative Markdown reference", () => {
  const lock = JSON.parse(readFileSync(path.join(repoRoot, ".github/emil-skills-sync/upstream-lock.json"), "utf8"));
  for (const source of lock.files.filter((file) => file.endsWith(".md"))) {
    const local = source.replace(/^skills\/prototype\//, "skills/ui-prototype/").replace(/^skills\//, "skills/design/");
    const file = path.join(repoRoot, local);
    const content = readFileSync(file, "utf8");
    for (const [, target] of content.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(target) || target.startsWith("/")) continue;
      assert.equal(existsSync(path.resolve(path.dirname(file), target)), true, `${local}: missing reference ${target}`);
    }
  }
});

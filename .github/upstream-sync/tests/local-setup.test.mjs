import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const setupScript = path.join(repoRoot, "scripts", "init_setup_local_repo_wsl.sh");

function projectFixture() {
  return mkdtempSync(path.join(tmpdir(), "antigravity-project-"));
}

function runSetup(project, ...args) {
  return spawnSync("bash", [setupScript, ...args], {
    cwd: project,
    encoding: "utf8",
  });
}

test("WSL setup creates project-local context and flat skill links", () => {
  const project = projectFixture();
  try {
    const result = runSetup(project);
    assert.equal(result.status, 0, result.stderr);

    const agents = path.join(project, ".agents");
    assert.throws(() => lstatSync(path.join(agents, "AGENTS.md")), /ENOENT/);
    assert.equal(lstatSync(path.join(agents, "CONTEXT.md")).isFile(), true);
    assert.equal(lstatSync(path.join(agents, "docs", "adr")).isDirectory(), true);
    assert.equal(lstatSync(path.join(agents, "skills")).isDirectory(), true);
    assert.equal(lstatSync(path.join(agents, "rules")).isSymbolicLink(), true);
    assert.equal(lstatSync(path.join(agents, "skills", "tdd")).isSymbolicLink(), true);
    assert.equal(lstatSync(path.join(agents, "skills", "i-have-adhd")).isSymbolicLink(), true);
    assert.equal(lstatSync(path.join(agents, "skills", "taiwan-term")).isSymbolicLink(), true);
    assert.equal(
      realpathSync(path.join(agents, "skills", "tdd")),
      realpathSync(path.join(repoRoot, "skills", "engineering", "tdd")),
    );
    assert.equal(
      realpathSync(path.join(agents, "skills", "i-have-adhd")),
      realpathSync(path.join(repoRoot, "skills", "productivity", "i-have-adhd")),
    );
    assert.equal(
      realpathSync(path.join(agents, "skills", "taiwan-term")),
      realpathSync(path.join(repoRoot, "skills", "language", "taiwan-term")),
    );
    assert.equal(realpathSync(path.join(agents, "rules")), realpathSync(path.join(repoRoot, "rules")));
    assert.match(readFileSync(path.join(agents, ".gitignore"), "utf8"), /^\/skills$/m);
    assert.match(readFileSync(path.join(agents, ".gitignore"), "utf8"), /^\/rules$/m);
    assert.match(readFileSync(path.join(agents, ".gitignore"), "utf8"), /^\/\.install-state$/m);
    assert.match(readFileSync(path.join(agents, ".install-state"), "utf8"), /^version=1\nmode=link\nchannel=all\nsource=/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL uninstall removes only managed runtime entries and preserves project knowledge", () => {
  const project = projectFixture();
  try {
    assert.equal(runSetup(project).status, 0);
    const agents = path.join(project, ".agents");
    const skills = path.join(agents, "skills");
    symlinkSync(tmpdir(), path.join(skills, "project-local"));
    const context = path.join(agents, "CONTEXT.md");
    writeFileSync(context, "# Project Context\n\nPreserve me.\n");

    const result = runSetup(project, "--uninstall");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(path.join(skills, "tdd")), false);
    assert.equal(realpathSync(path.join(skills, "project-local")), realpathSync(tmpdir()));
    assert.equal(existsSync(path.join(agents, "rules")), false);
    assert.equal(existsSync(path.join(agents, ".install-state")), false);
    assert.equal(readFileSync(context, "utf8"), "# Project Context\n\nPreserve me.\n");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL setup supports an explicit stable channel without in-progress skills", () => {
  const project = projectFixture();
  try {
    const stable = runSetup(project, "--sync", "--channel", "stable");
    assert.equal(stable.status, 0, stable.stderr);
    const skills = path.join(project, ".agents", "skills");
    assert.equal(existsSync(path.join(skills, "tdd")), true);
    assert.equal(existsSync(path.join(skills, "implement-spec")), false);
    assert.equal(existsSync(path.join(skills, "retro")), false);
    assert.match(readFileSync(path.join(project, ".agents", ".install-state"), "utf8"), /^channel=stable$/m);
    assert.equal(runSetup(project, "--check", "--channel", "stable").status, 0);
    assert.equal(runSetup(project, "--check", "--channel", "all").status, 2);
    assert.equal(runSetup(project, "--sync", "--channel", "all").status, 0);
    assert.equal(existsSync(path.join(skills, "implement-spec")), true);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL check reports inventory drift and sync reconciles only managed links", () => {
  const project = projectFixture();
  try {
    assert.equal(runSetup(project).status, 0);
    const skills = path.join(project, ".agents", "skills");
    unlinkSync(path.join(skills, "tdd"));
    symlinkSync(path.join(repoRoot, "skills", "engineering", "removed"), path.join(skills, "removed"));
    symlinkSync(tmpdir(), path.join(skills, "project-local"));

    const check = runSetup(project, "--check");
    assert.equal(check.status, 2, check.stderr);
    assert.match(check.stdout, /Missing: .*skills\/tdd/);
    assert.match(check.stdout, /Stale: .*skills\/removed/);
    assert.equal(existsSync(path.join(skills, "tdd")), false);
    assert.equal(lstatSync(path.join(skills, "removed")).isSymbolicLink(), true);

    const sync = runSetup(project, "--sync");
    assert.equal(sync.status, 0, sync.stderr);
    assert.equal(realpathSync(path.join(skills, "tdd")), realpathSync(path.join(repoRoot, "skills", "engineering", "tdd")));
    assert.equal(existsSync(path.join(skills, "removed")), false);
    assert.equal(realpathSync(path.join(skills, "project-local")), realpathSync(tmpdir()));
    assert.equal(runSetup(project, "--check").status, 0);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL setup is idempotent and preserves local project knowledge", () => {
  const project = projectFixture();
  try {
    assert.equal(runSetup(project).status, 0);
    const context = path.join(project, ".agents", "CONTEXT.md");
    const localContent = "# Project Context\n\n**Local term**: must survive.\n";
    writeFileSync(context, localContent);

    const result = runSetup(project);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(context, "utf8"), localContent);
    assert.match(result.stdout, /Unchanged: .*CONTEXT\.md/);
    assert.match(result.stdout, /Unchanged: .*skills\/tdd/);
    assert.match(result.stdout, /Unchanged: .*rules/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL setup rejects a conflicting flat skill before writing local files", () => {
  const project = projectFixture();
  try {
    mkdirSync(path.join(project, ".agents", "skills", "tdd"), { recursive: true });

    const result = runSetup(project);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to replace an existing file or directory/);
    assert.throws(() => lstatSync(path.join(project, ".agents", "CONTEXT.md")), /ENOENT/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL setup migrates the legacy whole-directory skills link", () => {
  const project = projectFixture();
  try {
    const agents = path.join(project, ".agents");
    mkdirSync(agents, { recursive: true });
    const legacy = path.join(agents, "skills");
    const result = spawnSync("ln", ["-s", path.join(repoRoot, "skills"), legacy], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);

    const setup = runSetup(project);
    assert.equal(setup.status, 0, setup.stderr);
    assert.equal(lstatSync(legacy).isDirectory(), true);
    assert.equal(lstatSync(path.join(legacy, "tdd")).isSymbolicLink(), true);
    assert.match(setup.stdout, /Migrated: .*\.agents\/skills/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL setup refuses to initialize the Agent home itself", () => {
  const result = runSetup(repoRoot);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not from the Agent home/);
});

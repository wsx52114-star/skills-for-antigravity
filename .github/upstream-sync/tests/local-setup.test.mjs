import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
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

function runSetup(project) {
  return spawnSync("bash", [setupScript], {
    cwd: project,
    encoding: "utf8",
  });
}

test("WSL setup creates project-local context and shared directory links", () => {
  const project = projectFixture();
  try {
    const result = runSetup(project);
    assert.equal(result.status, 0, result.stderr);

    const agents = path.join(project, ".agents");
    assert.throws(() => lstatSync(path.join(agents, "AGENTS.md")), /ENOENT/);
    assert.equal(lstatSync(path.join(agents, "CONTEXT.md")).isFile(), true);
    assert.equal(lstatSync(path.join(agents, "docs", "adr")).isDirectory(), true);
    assert.equal(lstatSync(path.join(agents, "skills")).isSymbolicLink(), true);
    assert.equal(lstatSync(path.join(agents, "rules")).isSymbolicLink(), true);
    assert.equal(realpathSync(path.join(agents, "skills")), realpathSync(path.join(repoRoot, "skills")));
    assert.equal(realpathSync(path.join(agents, "rules")), realpathSync(path.join(repoRoot, "rules")));
    assert.match(readFileSync(path.join(agents, ".gitignore"), "utf8"), /^\/skills$/m);
    assert.match(readFileSync(path.join(agents, ".gitignore"), "utf8"), /^\/rules$/m);
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
    assert.match(result.stdout, /Unchanged: .*skills/);
    assert.match(result.stdout, /Unchanged: .*rules/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL setup rejects a conflicting skills directory before writing local files", () => {
  const project = projectFixture();
  try {
    mkdirSync(path.join(project, ".agents", "skills"), { recursive: true });

    const result = runSetup(project);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to replace an existing file or directory/);
    assert.throws(() => lstatSync(path.join(project, ".agents", "CONTEXT.md")), /ENOENT/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("WSL setup refuses to initialize the Agent home itself", () => {
  const result = runSetup(repoRoot);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not from the Agent home/);
});

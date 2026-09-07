#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { listRegularFiles, requireCommitSha } from "../upstream-sync/lib/snapshot.mjs";

const upstreamRepository = "https://github.com/ayghri/i-have-adhd";

function parseArgs(argv) {
  const options = { repoRoot: null, snapshotRoot: null, sha: null };
  const keys = new Map([
    ["--repo-root", "repoRoot"],
    ["--snapshot-root", "snapshotRoot"],
    ["--sha", "sha"],
  ]);
  for (let index = 0; index < argv.length; index += 2) {
    const key = keys.get(argv[index]);
    const value = argv[index + 1];
    if (!key || !value) throw new Error(`Invalid arguments near ${argv[index] ?? "end"}`);
    options[key] = value;
  }
  if (!options.repoRoot || !options.snapshotRoot || !options.sha) {
    throw new Error("--repo-root, --snapshot-root, and --sha are required");
  }
  requireCommitSha(options.sha);
  options.repoRoot = path.resolve(options.repoRoot);
  options.snapshotRoot = path.resolve(options.snapshotRoot);
  return options;
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function requireExplicitInvocation(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("Invalid i-have-adhd SKILL.md: YAML frontmatter is required");
  let frontmatter = match[1];
  if (/^disable-model-invocation:/m.test(frontmatter)) {
    frontmatter = frontmatter.replace(/^disable-model-invocation:.*$/m, "disable-model-invocation: true");
  } else {
    frontmatter += "\ndisable-model-invocation: true";
  }
  return `---\n${frontmatter}\n---${content.slice(match[0].length)}`;
}

function requireExplicitCodexInvocation(content) {
  if (!/^\s*allow_implicit_invocation:/m.test(content)) {
    throw new Error("Invalid i-have-adhd agents/openai.yaml: invocation policy is required");
  }
  return content.replace(
    /^(\s*allow_implicit_invocation:)\s*.*$/m,
    "$1 false",
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const upstreamLicense = path.join(options.snapshotRoot, "LICENSE");
  const upstreamSkillRoot = path.join(options.snapshotRoot, "skills", "i-have-adhd");
  const destinationRoot = path.join(options.repoRoot, "skills", "productivity", "i-have-adhd");
  const lockPath = path.join(options.repoRoot, ".github", "i-have-adhd-sync", "upstream-lock.json");

  if (!existsSync(upstreamLicense) || !lstatSync(upstreamLicense).isFile()) {
    throw new Error("Invalid i-have-adhd snapshot: root LICENSE is required");
  }
  if (!existsSync(path.join(upstreamSkillRoot, "SKILL.md"))) {
    throw new Error("Invalid i-have-adhd snapshot: skills/i-have-adhd/SKILL.md is required");
  }

  const skillFiles = listRegularFiles(upstreamSkillRoot);
  const upstreamFiles = ["LICENSE", ...skillFiles.map((file) => `skills/i-have-adhd/${file}`)].sort();
  const expectedLocal = new Set(
    ["LICENSE", ...skillFiles].map((file) => normalize(path.join("skills/productivity/i-have-adhd", file))),
  );
  const tracked = execFileSync(
    "git",
    ["-C", options.repoRoot, "ls-files", "-z", "--", "skills/productivity/i-have-adhd"],
    { encoding: "utf8" },
  ).split("\0").filter(Boolean);

  for (const relativePath of tracked) {
    if (!expectedLocal.has(normalize(relativePath))) {
      rmSync(path.join(options.repoRoot, relativePath), { force: true });
    }
  }

  mkdirSync(destinationRoot, { recursive: true });
  copyFileSync(upstreamLicense, path.join(destinationRoot, "LICENSE"));
  for (const relativePath of skillFiles) {
    const source = path.join(upstreamSkillRoot, relativePath);
    const destination = path.join(destinationRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    if (relativePath === "SKILL.md") {
      writeFileSync(destination, requireExplicitInvocation(readFileSync(source, "utf8")));
    } else if (relativePath === "agents/openai.yaml") {
      writeFileSync(destination, requireExplicitCodexInvocation(readFileSync(source, "utf8")));
    } else {
      copyFileSync(source, destination);
    }
    if (process.platform !== "win32") chmodSync(destination, statSync(source).mode);
  }

  const lock = {
    repository: upstreamRepository,
    commit: options.sha,
    syncedAt: new Date().toISOString(),
    files: upstreamFiles,
  };
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`Applied ${skillFiles.length} i-have-adhd files from ${options.sha}.`);
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}

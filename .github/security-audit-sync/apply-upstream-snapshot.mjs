#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { listRegularFiles, requireCommitSha } from "../upstream-sync/lib/snapshot.mjs";

const upstreamRepository = "https://github.com/cloudflare/security-audit-skill";

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

function main() {
  const options = parseArgs(process.argv.slice(2));
  const upstreamLicense = path.join(options.snapshotRoot, "LICENSE");
  const upstreamSkillRoot = path.join(options.snapshotRoot, "skills", "security-audit");
  const destinationRoot = path.join(options.repoRoot, "skills", "security", "security-audit");
  const lockPath = path.join(options.repoRoot, ".github", "security-audit-sync", "upstream-lock.json");

  if (!existsSync(upstreamLicense) || !lstatSync(upstreamLicense).isFile()) {
    throw new Error("Invalid Cloudflare snapshot: root LICENSE is required");
  }
  if (!existsSync(path.join(upstreamSkillRoot, "SKILL.md"))) {
    throw new Error("Invalid Cloudflare snapshot: skills/security-audit/SKILL.md is required");
  }

  const skillFiles = listRegularFiles(upstreamSkillRoot);
  const upstreamFiles = ["LICENSE", ...skillFiles.map((file) => `skills/security-audit/${file}`)].sort();
  const destinationFiles = new Map([
    ["LICENSE", upstreamLicense],
    ...skillFiles.map((file) => [file, path.join(upstreamSkillRoot, file)]),
  ]);
  const tracked = execFileSync(
    "git",
    ["-C", options.repoRoot, "ls-files", "-z", "--", "skills/security/security-audit"],
    { encoding: "utf8" },
  ).split("\0").filter(Boolean);
  const expectedLocal = new Set(
    [...destinationFiles.keys()].map((file) => normalize(path.join("skills/security/security-audit", file))),
  );

  for (const relativePath of tracked) {
    if (!expectedLocal.has(normalize(relativePath))) {
      rmSync(path.join(options.repoRoot, relativePath), { force: true });
    }
  }

  for (const [relativePath, source] of destinationFiles) {
    const destination = path.join(destinationRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
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
  console.log(`Applied ${skillFiles.length} Cloudflare security-audit files from ${options.sha}.`);
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}

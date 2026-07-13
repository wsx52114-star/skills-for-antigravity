#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

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
  if (!/^[0-9a-f]{40}$/.test(options.sha)) {
    throw new Error("--sha must be a full lowercase commit SHA");
  }
  options.repoRoot = path.resolve(options.repoRoot);
  options.snapshotRoot = path.resolve(options.snapshotRoot);
  return options;
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function listRegularFiles(root, directory = root, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Upstream skill contains a forbidden symlink: ${normalize(path.relative(root, fullPath))}`);
    }
    if (entry.isDirectory()) listRegularFiles(root, fullPath, result);
    else if (entry.isFile()) result.push(normalize(path.relative(root, fullPath)));
    else throw new Error(`Upstream skill contains an unsupported file type: ${entry.name}`);
  }
  return result.sort();
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
    ["-C", options.repoRoot, "ls-files", "--", "skills/security/security-audit"],
    { encoding: "utf8" },
  ).split(/\r?\n/).filter(Boolean);
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

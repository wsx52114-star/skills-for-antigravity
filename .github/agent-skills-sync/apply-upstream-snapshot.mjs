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

const upstreamRepository = "https://github.com/addyosmani/agent-skills";

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
  if (!/^[0-9a-f]{40}$/.test(options.sha)) throw new Error("--sha must be a full lowercase commit SHA");
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
    const relative = normalize(path.relative(root, fullPath));
    if (entry.isSymbolicLink()) throw new Error(`Upstream snapshot contains a forbidden symlink: ${relative}`);
    if (entry.isDirectory()) listRegularFiles(root, fullPath, result);
    else if (entry.isFile()) result.push(relative);
    else throw new Error(`Upstream snapshot contains an unsupported file type: ${relative}`);
  }
  return result.sort();
}

function loadSelection(repoRoot) {
  const selectionPath = path.join(repoRoot, ".github", "agent-skills-sync", "selection.json");
  const selection = JSON.parse(readFileSync(selectionPath, "utf8"));
  if (selection.repository !== upstreamRepository) throw new Error("Selection repository does not match Addy upstream");
  if (!Array.isArray(selection.skills) || selection.skills.length === 0) throw new Error("Selection must contain skills");
  if (selection.skills.some((name) => !/^[a-z0-9-]+$/.test(name))) throw new Error("Selection contains an invalid skill name");
  const sortedUnique = [...new Set(selection.skills)].sort();
  if (JSON.stringify(selection.skills) !== JSON.stringify(sortedUnique)) {
    throw new Error("Selection skills must be sorted and unique");
  }
  return selection;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const selection = loadSelection(options.repoRoot);
  const destinationRoot = path.join(options.repoRoot, "skills", "addyosmani-pack");
  const license = path.join(options.snapshotRoot, "LICENSE");
  const referencesRoot = path.join(options.snapshotRoot, "references");
  if (!existsSync(license) || !lstatSync(license).isFile()) throw new Error("Addy snapshot requires a root LICENSE");
  if (!existsSync(referencesRoot) || !lstatSync(referencesRoot).isDirectory()) {
    throw new Error("Addy snapshot requires references/");
  }

  const files = ["LICENSE", ...listRegularFiles(options.snapshotRoot, referencesRoot)];
  for (const name of selection.skills) {
    const skillRoot = path.join(options.snapshotRoot, "skills", name);
    const skillFile = path.join(skillRoot, "SKILL.md");
    if (!existsSync(skillFile) || !lstatSync(skillFile).isFile()) throw new Error(`Selected skill is missing: ${name}`);
    const metadataName = readFileSync(skillFile, "utf8").match(/^name:\s*([^\r\n]+)$/m)?.[1]?.trim();
    if (metadataName !== name) throw new Error(`Selected skill frontmatter name does not match: ${name}`);
    files.push(...listRegularFiles(options.snapshotRoot, skillRoot));
  }
  files.sort();

  const expectedLocal = new Set(files.map((file) => normalize(path.join("skills/addyosmani-pack", file))));
  const tracked = execFileSync(
    "git",
    ["-C", options.repoRoot, "ls-files", "--", "skills/addyosmani-pack"],
    { encoding: "utf8" },
  ).split(/\r?\n/).filter(Boolean);
  for (const relativePath of tracked) {
    if (!expectedLocal.has(normalize(relativePath))) rmSync(path.join(options.repoRoot, relativePath), { force: true });
  }

  for (const relativePath of files) {
    const source = path.join(options.snapshotRoot, relativePath);
    const destination = path.join(destinationRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    if (process.platform !== "win32") chmodSync(destination, statSync(source).mode);
  }

  const lock = {
    repository: upstreamRepository,
    commit: options.sha,
    syncedAt: new Date().toISOString(),
    skills: selection.skills,
    files,
  };
  const lockPath = path.join(options.repoRoot, ".github", "agent-skills-sync", "upstream-lock.json");
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`Applied ${selection.skills.length} selected Addy skills from ${options.sha}.`);
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}

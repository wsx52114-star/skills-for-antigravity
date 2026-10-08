#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { listRegularFiles, requireCommitSha } from "../upstream-sync/lib/snapshot.mjs";
import { adaptSkill, destinationPrefix, runtimeSkillName, upstreamRepository } from "./lib.mjs";

function parseArgs(argv) {
  const options = {};
  const keys = new Map([["--repo-root", "repoRoot"], ["--snapshot-root", "snapshotRoot"], ["--sha", "sha"]]);
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  const licensePath = path.join(options.snapshotRoot, "LICENSE");
  if (!existsSync(licensePath) || !lstatSync(licensePath).isFile()) {
    throw new Error("Invalid Emil snapshot: root LICENSE is required");
  }
  const license = readFileSync(licensePath);
  const sourceRoot = path.join(options.snapshotRoot, "skills");
  const files = listRegularFiles(sourceRoot);
  const skillNames = [...new Set(files.map((file) => file.split("/")[0]))].sort();
  if (!skillNames.length) throw new Error("Invalid Emil snapshot: skills are required");

  // Validate every skill and prepare its bytes before removing or writing anything.
  const planned = new Map();
  const localNames = new Set();
  for (const name of skillNames) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || !files.includes(`${name}/SKILL.md`)) {
      throw new Error(`Invalid Emil skill directory: ${name}`);
    }
    const localName = runtimeSkillName(name);
    if (localNames.has(localName)) throw new Error(`Duplicate Emil runtime skill: ${localName}`);
    localNames.add(localName);
    const skillContent = adaptSkill(readFileSync(path.join(sourceRoot, name, "SKILL.md"), "utf8"), name);
    const localRoot = `${destinationPrefix}${localName}/`;
    planned.set(`${localRoot}LICENSE`, { bytes: license, mode: statSync(licensePath).mode });
    for (const file of files.filter((file) => file.startsWith(`${name}/`))) {
      const relative = file.slice(name.length + 1);
      if (relative === "LICENSE") throw new Error(`Emil skill LICENSE conflicts with root license: ${name}`);
      const source = path.join(sourceRoot, file);
      planned.set(`${localRoot}${relative}`, {
        bytes: relative === "SKILL.md" ? Buffer.from(skillContent) : readFileSync(source),
        mode: statSync(source).mode,
      });
    }
  }

  const tracked = execFileSync("git", ["-C", options.repoRoot, "ls-files", "-z", "--", destinationPrefix], { encoding: "utf8" })
    .split("\0").filter(Boolean);
  for (const file of tracked) {
    if (file !== `${destinationPrefix}README.md` && !planned.has(file)) {
      rmSync(path.join(options.repoRoot, file), { force: true });
    }
  }
  for (const [file, { bytes, mode }] of planned) {
    const destination = path.join(options.repoRoot, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
    if (process.platform !== "win32") chmodSync(destination, mode);
  }
  const lockPath = path.join(options.repoRoot, ".github", "emil-skills-sync", "upstream-lock.json");
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify({
    repository: upstreamRepository,
    commit: options.sha,
    syncedAt: new Date().toISOString(),
    files: ["LICENSE", ...files.map((file) => `skills/${file}`)].sort(),
  }, null, 2)}\n`);
  console.log(`Applied ${skillNames.length} Emil skills from ${options.sha}.`);
}

try { main(); } catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}

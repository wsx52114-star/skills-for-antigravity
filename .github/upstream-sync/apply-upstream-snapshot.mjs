#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadPolicy, matchesAny } from "./lib/policy.mjs";

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
  options.repoRoot = path.resolve(options.repoRoot);
  options.snapshotRoot = path.resolve(options.snapshotRoot);
  return options;
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function listFiles(root, directory = root, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) listFiles(root, fullPath, result);
    else if (entry.isFile()) result.push(normalize(path.relative(root, fullPath)));
  }
  return result.sort();
}

function withoutExcludedSkillReferences(content, excludedSegments) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  return content
    .split(/\r?\n/)
    .filter((line) => !excludedSegments.some((segment) => line.includes(`./${segment}/`)))
    .join(newline);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const controlPlaneRoot = path.dirname(fileURLToPath(import.meta.url));
  const ownership = loadPolicy(controlPlaneRoot);
  const isAllowed = (item) => matchesAny(item, ownership.upstreamAllowlist);
  const isForkOwned = (item) => matchesAny(item, ownership.forkOwned);
  const excludedSkillNames = new Set(ownership.excludedSkillNames ?? []);
  const excludedSkillPathSegments = new Set(ownership.excludedSkillPathSegments ?? []);
  const excludedReferenceSegments = [...excludedSkillNames, ...excludedSkillPathSegments];
  const isExcludedSkill = (item) => {
    const segments = item.split("/");
    return segments[0] === "skills" && segments.some(
      (segment) => excludedSkillNames.has(segment) || excludedSkillPathSegments.has(segment),
    );
  };
  const snapshotFiles = listFiles(options.snapshotRoot);
  const blockedCollisions = snapshotFiles.filter((item) => matchesAny(item, ownership.blockedUpstreamPaths));
  if (blockedCollisions.length) {
    throw new Error(`Upstream snapshot collides with fork-owned paths: ${blockedCollisions.join(", ")}`);
  }
  const allowedFiles = snapshotFiles.filter((item) => isAllowed(item) && !isExcludedSkill(item));
  const hasLicense = allowedFiles.includes("LICENSE");
  const skillDefinitions = allowedFiles.filter((item) => item.startsWith("skills/") && item.endsWith("/SKILL.md"));
  if (!hasLicense || skillDefinitions.length === 0) {
    throw new Error("Invalid upstream snapshot: LICENSE and at least one skills/**/SKILL.md are required");
  }
  const installable = allowedFiles.filter((item) => !isForkOwned(item));
  const installableSet = new Set(installable);
  const tracked = execFileSync("git", ["-C", options.repoRoot, "ls-files"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);

  for (const relativePath of tracked) {
    if (isAllowed(relativePath) && !isForkOwned(relativePath) && !installableSet.has(relativePath)) {
      rmSync(path.join(options.repoRoot, relativePath), { recursive: true, force: true });
    }
  }
  for (const relativePath of installable) {
    const source = path.join(options.snapshotRoot, relativePath);
    const destination = path.join(options.repoRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    const segments = relativePath.split("/");
    const isCategoryReadme = segments.length === 3 && segments[0] === "skills" && segments[2] === "README.md";
    if (isCategoryReadme) {
      const content = readFileSync(destination, "utf8");
      writeFileSync(destination, withoutExcludedSkillReferences(content, excludedReferenceSegments));
    }
    if (process.platform !== "win32") chmodSync(destination, statSync(source).mode);
  }
  const lock = {
    repository: ownership.upstream,
    commit: options.sha,
    syncedAt: new Date().toISOString(),
    files: installable,
  };
  writeFileSync(
    path.join(options.repoRoot, ".github", "upstream-sync", "upstream-lock.json"),
    `${JSON.stringify(lock, null, 2)}\n`,
  );
  console.log(`Applied ${installable.length} upstream files from ${options.sha}.`);
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}

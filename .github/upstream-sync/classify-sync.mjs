#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadPolicy, matchesAny } from "./lib/policy.mjs";

function parseArgs(argv) {
  const options = { repoRoot: process.cwd(), before: null, after: null, githubOutput: null };
  const keys = new Map([
    ["--repo-root", "repoRoot"],
    ["--before", "before"],
    ["--after", "after"],
    ["--github-output", "githubOutput"],
  ]);
  for (let index = 0; index < argv.length; index += 2) {
    const key = keys.get(argv[index]);
    const value = argv[index + 1];
    if (!key || !value) throw new Error(`Invalid arguments near ${argv[index] ?? "end"}`);
    options[key] = value;
  }
  if (!options.before || !options.after) throw new Error("--before and --after are required");
  options.repoRoot = path.resolve(options.repoRoot);
  return options;
}

function git(repoRoot, args) {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

function lines(value) {
  return value ? value.split(/\r?\n/).filter(Boolean) : [];
}

function skillPaths(repoRoot, reference) {
  return lines(git(repoRoot, ["ls-tree", "-r", "--name-only", reference, "--", "skills"]))
    .filter((item) => item.endsWith("/SKILL.md"))
    .sort();
}

function diffEntries(repoRoot, before, after) {
  return lines(git(repoRoot, ["diff", "--name-status", "-M", before, after])).map((line) => {
    const [status, ...paths] = line.split("\t");
    return { status: status[0], paths };
  });
}

function sameItems(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const controlPlaneRoot = path.dirname(fileURLToPath(import.meta.url));
  const ownership = loadPolicy(controlPlaneRoot);
  const entries = diffEntries(options.repoRoot, options.before, options.after);
  const changed = [...new Set(entries.flatMap((entry) => entry.paths))];
  const beforeSkills = skillPaths(options.repoRoot, options.before);
  const afterSkills = skillPaths(options.repoRoot, options.after);
  const stableInventory = sameItems(beforeSkills, afterSkills);
  const skillRoots = beforeSkills.map((item) => `${path.posix.dirname(item)}/`);
  const contentOnly = stableInventory && entries.every((entry) =>
    entry.status === "M" &&
    entry.paths.length === 1 &&
    entry.paths[0].endsWith(".md") &&
    skillRoots.some((root) => entry.paths[0].startsWith(root))
  );
  const structural = !contentOnly;
  const collisions = changed.filter((item) => matchesAny(item, ownership.blockedUpstreamPaths));
  const blocked = collisions.length > 0;
  const output = {
    structural: String(structural),
    blocked: String(blocked),
    changed_count: String(changed.length),
    collision_paths: collisions.join(","),
  };
  for (const [key, value] of Object.entries(output)) console.log(`${key}=${value}`);
  if (options.githubOutput) {
    appendFileSync(
      options.githubOutput,
      Object.entries(output).map(([key, value]) => `${key}=${value}\n`).join(""),
    );
  }
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 2;
}

#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isExcludedUpstreamPath, loadPolicy, mapUpstreamPath, matchesAny } from "./lib/policy.mjs";
import { isAntigravitySkillFile, listRegularFiles, requireCommitSha } from "./lib/snapshot.mjs";

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

function withoutExcludedSkillReferences(content, excludedSegments) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  return content
    .split(/\r?\n/)
    .filter((line) => !excludedSegments.some((segment) => line.includes(`./${segment}/`)))
    .map((line) => line.replace(" (Claude Code: `disable-model-invocation: true`; Codex: `policy.allow_implicit_invocation: false` in `agents/openai.yaml`)", " (`disable-model-invocation: true`)"))
    .join(newline);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const controlPlaneRoot = path.dirname(fileURLToPath(import.meta.url));
  const ownership = loadPolicy(controlPlaneRoot);
  const upstreamLicensePath = ownership.upstreamLicensePath;
  if (typeof upstreamLicensePath !== "string" || !upstreamLicensePath.trim()) {
    throw new Error("Upstream ownership policy must define upstreamLicensePath");
  }
  const isAllowedSource = (item) => item === "LICENSE" || matchesAny(item, ownership.upstreamAllowlist);
  const isManagedLocal = (item) => item === upstreamLicensePath || matchesAny(item, ownership.upstreamAllowlist);
  const isProjectOwned = (item) => matchesAny(item, ownership.projectOwned);
  const excludedSkillNames = new Set(ownership.excludedSkillNames ?? []);
  const excludedSkillPathSegments = new Set(ownership.excludedSkillPathSegments ?? []);
  const excludedReferenceSegments = [...excludedSkillNames, ...excludedSkillPathSegments];
  const categoryMap = ownership.categoryMap ?? {};
  const snapshotFiles = listRegularFiles(options.snapshotRoot, options.snapshotRoot, [], (item) => !isAllowedSource(item));
  const blockedCollisions = snapshotFiles.filter((item) =>
    matchesAny(item, ownership.blockedUpstreamPaths) ||
    matchesAny(mapUpstreamPath(item, categoryMap, upstreamLicensePath), ownership.blockedUpstreamPaths),
  );
  if (blockedCollisions.length) {
    throw new Error(`Upstream snapshot collides with project-owned paths: ${blockedCollisions.join(", ")}`);
  }
  const allowedFiles = snapshotFiles.filter((item) => isAllowedSource(item) && !isExcludedUpstreamPath(item, ownership) &&
    (!item.startsWith("skills/") || isAntigravitySkillFile(item)));
  const hasLicense = allowedFiles.includes("LICENSE");
  const skillDefinitions = allowedFiles.filter((item) => item.startsWith("skills/") && item.endsWith("/SKILL.md"));
  if (!hasLicense || skillDefinitions.length === 0) {
    throw new Error("Invalid upstream snapshot: LICENSE and at least one skills/**/SKILL.md are required");
  }
  const mappedEntries = [];
  const seenDestinations = new Set();
  for (const item of allowedFiles) {
    const destination = mapUpstreamPath(item, categoryMap, upstreamLicensePath);
    if (seenDestinations.has(destination)) {
      throw new Error(`Upstream snapshot maps multiple files to the same path: ${destination}`);
    }
    seenDestinations.add(destination);
    mappedEntries.push({ source: item, destination });
  }
  const installable = mappedEntries.filter((entry) =>
    entry.source === "LICENSE"
      ? !isProjectOwned(entry.destination)
      : !isProjectOwned(entry.source) && !isProjectOwned(entry.destination),
  );
  const installableDestinations = installable.map((entry) => entry.destination).sort();
  const installableSet = new Set(installableDestinations);
  const tracked = execFileSync("git", ["-C", options.repoRoot, "ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);

  for (const relativePath of tracked) {
    if (isManagedLocal(relativePath) && !isProjectOwned(relativePath) && !installableSet.has(relativePath)) {
      rmSync(path.join(options.repoRoot, relativePath), { recursive: true, force: true });
    }
  }
  for (const entry of installable) {
    const source = path.join(options.snapshotRoot, entry.source);
    const destination = path.join(options.repoRoot, entry.destination);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    const segments = entry.destination.split("/");
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
    files: installableDestinations,
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

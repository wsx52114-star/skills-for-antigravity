#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { requireCommitSha } from "../upstream-sync/lib/snapshot.mjs";
import { planSkillIndexes, readRuntimeSkills, renderRootIndex } from "./indexes.mjs";

const sources = JSON.parse(readFileSync(new URL("./sources.json", import.meta.url), "utf8"));

export function sourceById(id) {
  if (!Object.hasOwn(sources, id)) throw new Error(`Unknown synchronization source: ${id}`);
  return sources[id];
}

export function selectSources(selection = "all") {
  if (selection !== "all") {
    sourceById(selection);
    return [selection];
  }
  return Object.keys(sources);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { maxBuffer: 32 * 1024 * 1024, ...options });
}

function git(repoRoot, ...args) {
  return run("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

export function fetchSnapshot(repoRoot, source, snapshotRoot) {
  const lock = JSON.parse(readFileSync(path.join(repoRoot, source.lock), "utf8"));
  requireCommitSha(lock.commit);
  git(repoRoot, "fetch", "--depth=1", source.repository, source.branch);
  const sha = git(repoRoot, "rev-parse", "FETCH_HEAD");
  requireCommitSha(sha);
  const result = { sha, short_sha: sha.slice(0, 12), changed: String(sha !== lock.commit), name: source.name, repository: source.repository };
  if (sha === lock.commit) return result;

  const entries = git(repoRoot, "ls-tree", "-r", "FETCH_HEAD", "--", ...(source.validationPaths ?? source.paths));
  const invalid = entries.split(/\r?\n/).filter((line) => line && !/^100(?:644|755) blob /.test(line));
  if (invalid.length) throw new Error(`Upstream snapshot contains unsupported Git entries: ${invalid.join(", ")}`);
  for (const required of source.requiredPaths) git(repoRoot, "cat-file", "-e", `FETCH_HEAD:${required}`);
  if (existsSync(snapshotRoot) && readdirSync(snapshotRoot).length) throw new Error("Snapshot destination must be empty");
  mkdirSync(snapshotRoot, { recursive: true });
  const archivePath = `${snapshotRoot}.tar`;
  try {
    // Keep checkout newline preferences from rewriting upstream snapshot bytes.
    writeFileSync(archivePath, run("git", ["-C", repoRoot, "-c", "core.autocrlf=false", "archive", "--format=tar", "FETCH_HEAD", ...source.paths]));
    run("tar", ["-xf", archivePath, "-C", snapshotRoot]);
  } finally { rmSync(archivePath, { force: true }); }
  return result;
}

export function applySnapshot(repoRoot, source, snapshotRoot, sha) {
  requireCommitSha(sha);
  // Reject malformed local indexes before the adapter changes installed files.
  planSkillIndexes(repoRoot, readRuntimeSkills(repoRoot));
  const runtime = source.runtime === "node" ? process.execPath : (process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3"));
  const output = run(runtime, [path.join(repoRoot, source.adapter), "--repo-root", repoRoot, "--snapshot-root", snapshotRoot, "--sha", sha], { encoding: "utf8" });
  for (const [relative, { bytes, mode }] of planSkillIndexes(repoRoot, readRuntimeSkills(repoRoot))) {
    const destination = path.join(repoRoot, relative);
    writeFileSync(destination, bytes);
    if (process.platform !== "win32") chmodSync(destination, mode);
  }
  return output;
}

export function commitSnapshot(repoRoot, source) {
  const sha = JSON.parse(readFileSync(path.join(repoRoot, source.lock), "utf8")).commit;
  requireCommitSha(sha);
  const before = git(repoRoot, "rev-parse", "HEAD");
  const branch = `${source.branchPrefix}${sha.slice(0, 12)}`;
  const title = `${source.title} ${sha.slice(0, 12)}`;
  git(repoRoot, "config", "user.name", "github-actions[bot]");
  git(repoRoot, "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
  git(repoRoot, "switch", "-c", branch);
  git(repoRoot, "add", "-A");
  const result = { branch, title, blocked: "false", structural: "true" };
  if (source.classify) {
    // Only a reproducible local index edit may accompany the source content.
    const indexChanged = Boolean(git(repoRoot, "diff", "--cached", "--name-only", "--", "README.md"));
    if (indexChanged) {
      const original = run("git", ["-C", repoRoot, "show", `${before}:README.md`], { encoding: "utf8" });
      const expected = renderRootIndex(original, readRuntimeSkills(repoRoot)).replaceAll("\r\n", "\n");
      const staged = run("git", ["-C", repoRoot, "show", ":README.md"], { encoding: "utf8" }).replaceAll("\r\n", "\n");
      const originalMode = git(repoRoot, "ls-tree", before, "--", "README.md").split(" ")[0];
      const stagedMode = git(repoRoot, "ls-files", "--stage", "--", "README.md").split(" ")[0];
      if (staged !== expected || originalMode !== stagedMode) throw new Error("README changes must match the generated skill index");
      git(repoRoot, "restore", "--staged", "README.md");
    }
    // Classify source content independently of the generated index and lock.
    git(repoRoot, "restore", "--staged", source.lock);
    const contentChanged = Boolean(git(repoRoot, "diff", "--cached", "--name-only"));
    if (contentChanged) git(repoRoot, "commit", "-m", title);
    const classification = run(process.execPath, [
      path.join(repoRoot, ".github/upstream-sync/classify-sync.mjs"),
      "--repo-root", repoRoot, "--before", before, "--after", "HEAD",
    ], { encoding: "utf8" });
    for (const line of classification.trim().split(/\r?\n/)) {
      const index = line.indexOf("=");
      if (index > 0) result[line.slice(0, index)] = line.slice(index + 1);
    }
    git(repoRoot, "add", source.lock);
    if (indexChanged) git(repoRoot, "add", "README.md");
    if (contentChanged) git(repoRoot, "commit", "--amend", "--no-edit");
    else git(repoRoot, "commit", "-m", title);
  } else {
    git(repoRoot, "commit", "-m", title);
  }
  return result;
}

function emit(values) {
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    if (/[\r\n]/.test(line)) throw new Error(`Invalid multiline workflow output: ${key}`);
    console.log(line);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
}

function main() {
  const [command, ...argv] = process.argv.slice(2);
  const options = {};
  const allowed = new Set(["source", "repo-root", "snapshot-root", "sha"]);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/, "");
    if (!allowed.has(key) || !argv[index + 1]) throw new Error(`Invalid arguments near ${argv[index]}`);
    options[key] = argv[index + 1];
  }
  if (command === "matrix") {
    emit({ sources: JSON.stringify(selectSources(options.source ?? "all")) });
    return;
  }
  const source = sourceById(options.source);
  const repoRoot = path.resolve(options["repo-root"] ?? process.cwd());
  if (command === "fetch" || command === "apply") {
    if (!options["snapshot-root"]) throw new Error("--snapshot-root is required");
    const snapshotRoot = path.resolve(options["snapshot-root"]);
    if (command === "apply") console.log(applySnapshot(repoRoot, source, snapshotRoot, options.sha));
    else {
      const result = fetchSnapshot(repoRoot, source, snapshotRoot);
      emit(result);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `### ${source.name}\n\nLatest commit: \`${result.sha}\`\n\n${result.changed === "true" ? "Update found; validation and PR steps follow." : "Already current; no adapter, tests, push, or PR steps needed."}\n`);
    }
  } else if (command === "commit") emit(commitSnapshot(repoRoot, source));
  else throw new Error(`Unknown synchronization command: ${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

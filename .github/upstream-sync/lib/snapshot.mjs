import { execFileSync } from "node:child_process";
import {
  chmodSync,
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

export const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export function toPosixPath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

export function loadSources() {
  return JSON.parse(readFileSync(new URL("../../skill-sync/sources.json", import.meta.url), "utf8"));
}

export function isAntigravitySkillFile(relativePath) {
  return !/(^|\/)agents\//.test(relativePath);
}

export function requireCommitSha(sha) {
  if (!COMMIT_SHA_RE.test(sha ?? "")) {
    throw new Error("--sha must be a full lowercase commit SHA");
  }
}

export function parseSnapshotArgs(argv) {
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

export function matchFrontmatter(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;
  return { raw: match[0], body: match[1], rest: content.slice(match[0].length) };
}

export function parseSkillFrontmatter(content) {
  const matched = matchFrontmatter(content);
  if (!matched) return null;
  const field = (name) =>
    matched.body.match(new RegExp(`^${name}:[ \\t]*["']?(.+?)["']?[ \\t]*\\r?$`, "m"))?.[1];
  return {
    body: matched.body,
    name: field("name"),
    description: field("description"),
    explicit: /^disable-model-invocation:[ \t]*true[ \t]*\r?$/m.test(matched.body),
  };
}

export function listRegularFiles(root, directory = root, result = [], ignoreSymlink = () => false) {
  if (!existsSync(directory)) return result;
  if (lstatSync(directory).isSymbolicLink()) {
    throw new Error(`Upstream snapshot contains a forbidden symlink: ${directory}`);
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      if (ignoreSymlink(toPosixPath(path.relative(root, fullPath)))) continue;
      throw new Error(`Upstream snapshot contains a forbidden symlink: ${fullPath}`);
    }
    if (entry.isDirectory()) listRegularFiles(root, fullPath, result, ignoreSymlink);
    else if (entry.isFile()) result.push(toPosixPath(path.relative(root, fullPath)));
    else throw new Error(`Upstream snapshot contains an unsupported file type: ${fullPath}`);
  }
  return result.sort();
}

export function syncSingleSkillSnapshot({
  sourceId,
  label,
  logLabel = label,
  upstreamSkillPath,
  localSkillPath,
  transformFile,
}) {
  const options = parseSnapshotArgs(process.argv.slice(2));
  const source = loadSources()[sourceId];
  if (!source) throw new Error(`Unknown synchronization source: ${sourceId}`);

  const upstreamLicense = path.join(options.snapshotRoot, "LICENSE");
  const upstreamSkillRoot = path.join(options.snapshotRoot, ...upstreamSkillPath.split("/"));
  const destinationRoot = path.join(options.repoRoot, ...localSkillPath.split("/"));
  const lockPath = path.join(options.repoRoot, ...source.lock.split("/"));

  if (!existsSync(upstreamLicense) || !lstatSync(upstreamLicense).isFile()) {
    throw new Error(`Invalid ${label} snapshot: root LICENSE is required`);
  }
  if (!existsSync(path.join(upstreamSkillRoot, "SKILL.md"))) {
    throw new Error(`Invalid ${label} snapshot: ${upstreamSkillPath}/SKILL.md is required`);
  }

  const skillFiles = listRegularFiles(upstreamSkillRoot).filter(isAntigravitySkillFile);
  const upstreamFiles = ["LICENSE", ...skillFiles.map((file) => `${upstreamSkillPath}/${file}`)].sort();
  const planned = new Map([
    ["LICENSE", { bytes: readFileSync(upstreamLicense), mode: statSync(upstreamLicense).mode }],
  ]);
  for (const relativePath of skillFiles) {
    const sourcePath = path.join(upstreamSkillRoot, relativePath);
    const transformed = transformFile ? transformFile(relativePath, sourcePath) : null;
    planned.set(relativePath, {
      bytes: transformed !== null && transformed !== undefined ? Buffer.from(transformed) : readFileSync(sourcePath),
      mode: statSync(sourcePath).mode,
    });
  }

  const expectedLocal = new Set([...planned.keys()].map((file) => toPosixPath(path.join(localSkillPath, file))));
  const tracked = execFileSync(
    "git",
    ["-C", options.repoRoot, "ls-files", "-z", "--", localSkillPath],
    { encoding: "utf8" },
  ).split("\0").filter(Boolean);

  for (const relativePath of tracked) {
    if (!expectedLocal.has(toPosixPath(relativePath))) {
      rmSync(path.join(options.repoRoot, relativePath), { force: true });
    }
  }

  for (const [relativePath, { bytes, mode }] of planned) {
    const destination = path.join(destinationRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
    if (process.platform !== "win32") chmodSync(destination, mode);
  }

  const lock = {
    repository: source.repository,
    commit: options.sha,
    syncedAt: new Date().toISOString(),
    files: upstreamFiles,
  };
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`Applied ${skillFiles.length} ${logLabel} files from ${options.sha}.`);
}

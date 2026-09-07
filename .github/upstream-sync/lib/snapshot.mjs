import { existsSync, lstatSync, readdirSync } from "node:fs";
import path from "node:path";

export function requireCommitSha(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) {
    throw new Error("--sha must be a full lowercase commit SHA");
  }
}

export function listRegularFiles(root, directory = root, result = []) {
  if (!existsSync(directory)) return result;
  if (lstatSync(directory).isSymbolicLink()) {
    throw new Error(`Upstream snapshot contains a forbidden symlink: ${directory}`);
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Upstream snapshot contains a forbidden symlink: ${fullPath}`);
    }
    if (entry.isDirectory()) listRegularFiles(root, fullPath, result);
    else if (entry.isFile()) result.push(path.relative(root, fullPath).split(path.sep).join("/"));
    else throw new Error(`Upstream snapshot contains an unsupported file type: ${fullPath}`);
  }
  return result.sort();
}

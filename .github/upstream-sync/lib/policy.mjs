import { readFileSync } from "node:fs";
import path from "node:path";

export function matchesPath(relativePath, configuredPath) {
  return configuredPath.endsWith("/")
    ? relativePath.startsWith(configuredPath)
    : relativePath === configuredPath;
}

export function matchesAny(relativePath, configuredPaths = []) {
  return configuredPaths.some((configuredPath) => matchesPath(relativePath, configuredPath));
}

export function loadPolicy(adapterRoot) {
  return JSON.parse(readFileSync(path.join(adapterRoot, "ownership.json"), "utf8"));
}

export function mapUpstreamPath(relativePath, categoryMap = {}) {
  const map = categoryMap ?? {};
  const segments = relativePath.split("/");
  if (segments[0] === "skills" && segments.length >= 2 && Object.hasOwn(map, segments[1])) {
    return ["skills", map[segments[1]], ...segments.slice(2)].join("/");
  }
  return relativePath;
}

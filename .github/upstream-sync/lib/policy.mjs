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

export function mapUpstreamPath(relativePath, categoryMap = {}, upstreamLicensePath = null) {
  if (relativePath === "LICENSE" && upstreamLicensePath) {
    return upstreamLicensePath;
  }
  const map = categoryMap ?? {};
  const segments = relativePath.split("/");
  if (segments[0] === "skills" && segments.length >= 2 && Object.hasOwn(map, segments[1])) {
    return ["skills", map[segments[1]], ...segments.slice(2)].join("/");
  }
  return relativePath;
}

export function isExcludedUpstreamPath(relativePath, policy = {}) {
  const excludedNames = new Set(policy.excludedSkillNames ?? []);
  const excludedSegments = new Set(policy.excludedSkillPathSegments ?? []);
  const segments = relativePath.split("/");
  if (segments[0] === "skills") {
    return segments.slice(1).some((segment) => excludedNames.has(segment) || excludedSegments.has(segment));
  }
  if (segments[0] === "docs") {
    if (segments.slice(1).some((segment) => excludedSegments.has(segment))) return true;
    const filename = segments.at(-1) ?? "";
    return filename.endsWith(".md") && excludedNames.has(filename.slice(0, -3));
  }
  return false;
}

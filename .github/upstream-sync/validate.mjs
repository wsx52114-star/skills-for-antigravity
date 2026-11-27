#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadPolicy } from "./lib/policy.mjs";
import { loadSources } from "./lib/snapshot.mjs";
import { listFiles, validateSkillsAndLayout } from "./lib/validate-skills.mjs";
import { validateLocks } from "./lib/validate-locks.mjs";
import { validatePlugins } from "./lib/validate-plugins.mjs";

const repoRoot = path.resolve(
  process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
);
const controlPlaneRoot = path.join(repoRoot, ".github", "upstream-sync");
const policy = loadPolicy(controlPlaneRoot);
const sources = loadSources();
const repositoryFiles = listFiles(repoRoot);
const errors = [];

const runtimeNames = validateSkillsAndLayout(repoRoot, policy, sources, repositoryFiles, errors);
validateLocks(repoRoot, policy, sources, repositoryFiles, runtimeNames, errors);
validatePlugins(repoRoot, runtimeNames, errors);

if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Repository is valid as a direct Agent home: ${runtimeNames.size} runtime skills.`);
}

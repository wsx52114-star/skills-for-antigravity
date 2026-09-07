import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("Git checkout preserves snapshot and shell LF bytes with core.autocrlf=true", () => {
  const root = mkdtempSync(path.join(tmpdir(), "antigravity-newlines-"));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
  try {
    git("init", "--quiet");
    git("config", "core.autocrlf", "true");
    const attributes = path.join(repoRoot, ".gitattributes");
    if (existsSync(attributes)) copyFileSync(attributes, path.join(root, ".gitattributes"));
    const fixtures = {
      "skills/language/taiwan-term/references/taiwan-md/terminology.snapshot.json": '{\n  "fixture": true\n}\n',
      "scripts/setup.sh": "#!/usr/bin/env bash\nexit 0\n",
    };
    for (const [relative, content] of Object.entries(fixtures)) {
      const file = path.join(root, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    git("add", ".");
    for (const relative of Object.keys(fixtures)) rmSync(path.join(root, relative));
    git("checkout-index", "--all", "--force");
    for (const [relative, content] of Object.entries(fixtures)) {
      assert.equal(readFileSync(path.join(root, relative), "utf8"), content, relative);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

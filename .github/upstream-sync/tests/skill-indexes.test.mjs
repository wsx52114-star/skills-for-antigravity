import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readRuntimeSkills, renderRootIndex } from "../../skill-sync/indexes.mjs";

function definition(category, name, explicit = false, description = "First sentence. Second sentence.") {
  return { relative: `skills/${category}/${name}/SKILL.md`, content: `---\nname: ${name}\ndescription: ${description}\n${explicit ? "disable-model-invocation: true\n" : ""}---\n` };
}

function table(category, name) {
  return `### ${category}\n\n| 關鍵字 | 觸發方式 | 用途 |\n| --- | --- | --- |\n${name ? `| [\`${name}\`](skills/${category.toLowerCase().replaceAll(" ", "-")}/${name}/SKILL.md) | 可自動選用 | 本地用途。 |\n` : ""}`;
}

test("shared root index handles all runtime categories, removal, moves, and invocation", () => {
  const categories = ["Engineering", "Design", "Security", "Language", "Misc", "Productivity", "In Progress"];
  const original = `# Local project\n\n${categories.map((category, index) => table(category, `skill-${index}`)).join("\n")}\nKeep local notes.\n\n## Maintenance\n\nKeep maintenance.\n`;
  const definitions = categories.slice(1).map((category, index) => definition(category.toLowerCase().replaceAll(" ", "-"), `skill-${index + 1}`, true));
  definitions.push(definition("productivity", "skill-0"));
  const rendered = renderRootIndex(original, definitions);
  assert.doesNotMatch(rendered, /skills\/engineering\/skill-0\//);
  assert.match(rendered, /skills\/productivity\/skill-0\/SKILL\.md\) \| 可自動選用 \| 本地用途。/);
  assert.equal((rendered.match(/本地用途。/g) ?? []).length, 7);
  assert.equal((rendered.match(/需明確指定/g) ?? []).length, 6);
  assert.match(rendered, /Keep local notes\.\n\n## Maintenance\n\nKeep maintenance\./);
  assert.equal(renderRootIndex(rendered, definitions), rendered);
  const removed = renderRootIndex(rendered, definitions.slice(1));
  assert.doesNotMatch(removed, /skills\/design\/skill-1\//);
  assert.match(removed, /### Design\n\n\| 關鍵字 \| 觸發方式 \| 用途 \|\n\| --- \| --- \| --- \|\n\n### Security/);
});

test("new categories get a table while local footer and CRLF remain intact", () => {
  const original = `${table("Engineering", "original")}\nLocal footer.\n\n## Maintenance\n\nKeep maintenance.\n`.replaceAll("\n", "\r\n");
  const definitions = [definition("engineering", "original"), definition("data-science", "added", true, "'First | sentence. Second sentence.'"), definition("testing", "another")];
  const rendered = renderRootIndex(original, definitions);
  assert.match(rendered, /### Data Science\r\n/);
  assert.match(rendered, /added\/SKILL\.md\) \| 需明確指定 \| First \\\| sentence\. \|/);
  assert.match(rendered, /### Testing\r\n/);
  assert.ok(rendered.indexOf("### Testing") < rendered.indexOf("Local footer."));
  assert.doesNotMatch(rendered, /(?<!\r)\n/);
  assert.equal(renderRootIndex(rendered, definitions), rendered);
});

test("shared root index preserves folded descriptions and ignores invocation text in the body", () => {
  const skill = definition("engineering", "added");
  skill.content = "---\nname: added\ndescription: >-\n  A multiline description.\n  More context.\n---\n\ndisable-model-invocation: true\n";
  const rendered = renderRootIndex(table("Engineering"), [skill]);
  assert.match(rendered, /\| 可自動選用 \| A multiline description\. \|/);
});

test("shared root index rejects malformed tables, duplicate headings, and invalid metadata", () => {
  const original = table("Engineering", "original");
  const definitions = [definition("engineering", "original")];
  assert.throws(() => renderRootIndex(original.replace("| --- | --- | --- |", "bad divider"), definitions), /missing the engineering table header/);
  assert.throws(() => renderRootIndex(original + original, definitions), /Duplicate skill index heading/);
  assert.throws(() => renderRootIndex(original.replace("skills/engineering/original/", "skills/engineering/wrong/"), definitions), /Unsupported engineering index row/);
  assert.throws(() => renderRootIndex(original, [...definitions, definition("design", "original")]), /Duplicate runtime skill/);
  assert.throws(() => renderRootIndex(original, [{ ...definitions[0], content: "invalid" }]), /valid name and description/);
});

test("current repository index generation is idempotent and preserves human descriptions", () => {
  const root = new URL("../../../", import.meta.url);
  const original = readFileSync(new URL("README.md", root), "utf8");
  assert.equal(renderRootIndex(original, readRuntimeSkills(fileURLToPath(root))), original);
});

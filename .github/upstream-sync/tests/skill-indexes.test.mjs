import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { categoryDisplayNames, managedCategoryIndexes, planSkillIndexes, readRuntimeSkills, renderCategoryIndex, renderRootIndex } from "../../skill-sync/indexes.mjs";

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

test("localized category headings render and update idempotently", () => {
  const original = [
    "# Overview",
    "",
    `### ${categoryDisplayNames.software}`,
    "",
    "| 關鍵字 | 觸發方式 | 用途 |",
    "| --- | --- | --- |",
    "| [`tdd`](skills/software/tdd/SKILL.md) | 可自動選用 | 保留既有軟體說明。 |",
    "",
    "Footer notes.",
  ].join("\n");
  const definitions = [
    definition("software", "tdd"),
    definition("hardware", "kicad-pcb"),
    definition("ui-design", "animate", true, "Build web animations."),
  ];
  const rendered = renderRootIndex(original, definitions);
  assert.match(rendered, /### 軟體開發（Software）/);
  assert.match(rendered, /保留既有軟體說明。/);
  assert.match(rendered, /### 硬體開發（Hardware）[\s\S]*skills\/hardware\/kicad-pcb\/SKILL\.md/);
  assert.match(rendered, /### Web 與介面設計（UI Design）[\s\S]*skills\/ui-design\/animate\/SKILL\.md\) \| 需明確指定/);
  assert.ok(rendered.indexOf("### Web 與介面設計（UI Design）") < rendered.indexOf("Footer notes."));
  assert.equal(renderRootIndex(rendered, definitions), rendered);
  assert.throws(() => renderRootIndex(`${rendered}\n### Software\n\n| 關鍵字 | 觸發方式 | 用途 |\n| --- | --- | --- |\n`, definitions), /Duplicate skill index heading/);
});

test("renderCategoryIndex updates Model-invoked and User-invoked entries idempotently", () => {
  const original = "# Software\n\n## Model-invoked\n\n- [tdd](./tdd/SKILL.md): Keep custom summary.\n- [stale](./stale/SKILL.md): Remove me.\n\n## User-invoked\n\nFooter notes.\n";
  const definitions = [
    definition("software", "tdd", true),
    definition("software", "research", false, "Investigate primary sources. More detail."),
    definition("productivity", "other"),
  ];
  const rendered = renderCategoryIndex(original, definitions, "software");
  assert.doesNotMatch(rendered, /stale/);
  assert.doesNotMatch(rendered, /other/);
  assert.match(rendered, /## Model-invoked\n\n- \[research\]\(\.\/research\/SKILL\.md\): Investigate primary sources\./);
  assert.match(rendered, /## User-invoked\n\n- \[tdd\]\(\.\/tdd\/SKILL\.md\): Keep custom summary\.\n\nFooter notes\./);
  assert.equal(renderCategoryIndex(rendered, definitions, "software"), rendered);
});

test("current repository index generation is idempotent and preserves human descriptions", () => {
  const rootPath = fileURLToPath(new URL("../../../", import.meta.url));
  const skills = readRuntimeSkills(rootPath);
  const original = readFileSync(`${rootPath}/README.md`, "utf8");
  assert.equal(renderRootIndex(original, skills), original);
  const planned = planSkillIndexes(rootPath, skills, { categoryIndexes: [...managedCategoryIndexes, "ui-design"] });
  for (const relative of ["README.md", "skills/productivity/README.md", "skills/software/README.md", "skills/ui-design/README.md"]) {
    assert.equal(planned.get(relative)?.bytes.toString("utf8"), readFileSync(`${rootPath}/${relative}`, "utf8"), relative);
  }
});

import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { listRegularFiles } from "../upstream-sync/lib/snapshot.mjs";

const tableHeader = "| 關鍵字 | 觸發方式 | 用途 |";
const tableDivider = /^\|(?:\s*:?-+:?\s*\|){3}$/;
const tableRow = /^\| \[\x60([a-z0-9-]+)\x60\]\((skills\/[^)]+\/SKILL\.md)\) \| .*? \| (.*) \|$/;

function section(content, heading, update) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const start = lines.indexOf(heading);
  if (start < 0) throw new Error(`Skill index is missing heading: ${heading}`);
  if (lines.lastIndexOf(heading) !== start) throw new Error(`Duplicate skill index heading: ${heading}`);
  const depth = heading.match(/^#+/)[0].length;
  const nextHeading = new RegExp(`^#{1,${depth}} `);
  let end = start + 1;
  while (end < lines.length && !nextHeading.test(lines[end])) end++;
  return [...lines.slice(0, start + 1), ...update(lines.slice(start + 1, end)), ...lines.slice(end)].join(newline);
}

function metadata({ relative, content }) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  const name = frontmatter?.match(/^name:[ \t]*["']?([a-z0-9]+(?:-[a-z0-9]+)*)["']?[ \t]*\r?$/m)?.[1];
  const description = frontmatter?.match(/^description:[ \t]*(.*)$/m);
  if (!name || !description || name !== path.posix.basename(path.posix.dirname(relative))) {
    throw new Error(`Skill index requires valid name and description frontmatter: ${relative}`);
  }
  return { relative, content, name, category: relative.split("/")[1], frontmatter,
    explicit: /^disable-model-invocation:[ \t]*true[ \t]*\r?$/m.test(frontmatter) };
}

function summary({ frontmatter }) {
  const match = frontmatter.match(/^description:[ \t]*(.*)$/m);
  let description = match[1].trim();
  if (/^[>|][-+]?$/.test(description)) {
    description = frontmatter.slice(match.index + match[0].length).match(/^(?:\r?\n[ \t]+[^\r\n]*)+/)?.[0] ?? "";
  }
  description = description.replace(/^(['"])([\s\S]*)\1$/, "$2").replace(/\s+/g, " ").trim();
  if (!description) throw new Error("Skill index requires a nonempty description");
  return description.split(/(?<=\.)\s+/)[0];
}

export function readRuntimeSkills(repoRoot) {
  return listRegularFiles(path.join(repoRoot, "skills"))
    .filter((relative) => relative.endsWith("/SKILL.md"))
    .map((relative) => ({ relative: `skills/${relative}`, content: readFileSync(path.join(repoRoot, "skills", relative), "utf8") }));
}

function skillsFrom(definitions) {
  const skills = definitions.map(metadata).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  if (new Set(skills.map((skill) => skill.name)).size !== skills.length) throw new Error("Duplicate runtime skill in index inventory");
  return skills;
}

function categoryHeading(category) {
  return `### ${category.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")}`;
}

export function renderRootIndex(content, definitions, categories) {
  const skills = skillsFrom(definitions);
  const lines = content.split(/\r?\n/);
  const indexedCategories = [];
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].startsWith("### ")) continue;
    let end = index + 1;
    while (end < lines.length && !/^#{1,3} /.test(lines[end])) end++;
    if (lines.slice(index + 1, end).includes(tableHeader)) {
      indexedCategories.push(lines[index].slice(4).toLowerCase().replaceAll(" ", "-"));
    }
  }
  const selected = categories ?? [...new Set([...indexedCategories, ...skills.map((skill) => skill.category)])];
  const descriptions = new Map(lines.map((line) => line.match(tableRow)).filter(Boolean).map((match) => [match[1], match[3]]));
  for (const category of selected) {
    const heading = categoryHeading(category);
    const rows = skills.filter((skill) => skill.category === category).map((skill) =>
      `| [\`${skill.name}\`](${skill.relative}) | ${skill.explicit ? "需明確指定" : "可自動選用"} | ${descriptions.get(skill.name) ?? summary(skill).replaceAll("|", "\\|")} |`);
    if (!content.split(/\r?\n/).includes(heading) && !categories && indexedCategories.length) {
      // Insert new categories after the last existing skill table, before local notes.
      content = section(content, categoryHeading(indexedCategories.at(-1)), (sectionLines) => {
        let end = sectionLines.indexOf(tableHeader) + 2;
        while (sectionLines[end]?.startsWith("|")) end++;
        return [...sectionLines.slice(0, end), "", heading, "", tableHeader, "| --- | --- | --- |", ...rows, ...sectionLines.slice(end)];
      });
      indexedCategories.push(category);
      continue;
    }
    content = section(content, heading, (sectionLines) => {
      const header = sectionLines.indexOf(tableHeader);
      if (header < 0 || !tableDivider.test(sectionLines[header + 1] ?? "")) {
        throw new Error(`Skill index is missing the ${category} table header`);
      }
      let end = header + 2;
      while (sectionLines[end]?.startsWith("|")) {
        const row = sectionLines[end].match(tableRow);
        if (!row || row[2].split("/")[1] !== category || path.posix.basename(path.posix.dirname(row[2])) !== row[1]) {
          throw new Error(`Unsupported ${category} index row: ${sectionLines[end]}`);
        }
        end++;
      }
      return [...sectionLines.slice(0, header + 2), ...rows, ...sectionLines.slice(end)];
    });
  }
  return content;
}

function categoryIndex(content, skills) {
  const descriptions = new Map([...content.matchAll(/^- \[([a-z0-9-]+)\]\(\.\/\1\/SKILL\.md\): (.*)$/gm)].map((match) => [match[1], match[2].replace(/\r$/, "")]));
  for (const [heading, explicit] of [["## Model-invoked", false], ["## User-invoked", true]]) {
    content = section(content, heading, (lines) => {
      const isEntry = (line) => /^- \[[a-z0-9-]+\]\(\.\/[a-z0-9-]+\/SKILL\.md\): /.test(line);
      let start = lines.findIndex(isEntry);
      if (start < 0) start = lines.findIndex((line) => line.trim());
      if (start < 0) start = Math.min(1, lines.length);
      let end = start;
      while (end < lines.length && isEntry(lines[end])) end++;
      const entries = skills.filter((skill) => skill.explicit === explicit).map((skill) =>
        `- [${skill.name}](./${skill.name}/SKILL.md): ${descriptions.get(skill.name) ?? summary(skill)}`);
      return [...lines.slice(0, start), ...entries, ...(entries.length && start === end ? [""] : []), ...lines.slice(end)];
    });
  }
  return content;
}

export function planSkillIndexes(repoRoot, definitions, { categories, categoryIndexes = [] } = {}) {
  const skills = skillsFrom(definitions);
  const planned = new Map();
  const indexes = [["README.md", (content) => renderRootIndex(content, definitions, categories)],
    ...categoryIndexes.map((category) => [`skills/${category}/README.md`, (content) => categoryIndex(content, skills.filter((skill) => skill.category === category))])];
  for (const [relative, update] of indexes) {
    const file = path.join(repoRoot, relative);
    if (!existsSync(file)) continue;
    const stat = lstatSync(file);
    if (!stat.isFile()) throw new Error(`Skill index must be a regular file: ${relative}`);
    planned.set(relative, { bytes: Buffer.from(update(readFileSync(file, "utf8"))), mode: stat.mode });
  }
  return planned;
}

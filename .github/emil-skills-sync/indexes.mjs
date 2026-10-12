import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

function section(content, heading, update) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const start = lines.indexOf(heading);
  if (start < 0) throw new Error(`Skill index is missing heading: ${heading}`);
  const depth = heading.match(/^#+/)[0].length;
  const nextHeading = new RegExp(`^#{1,${depth}} `);
  let end = start + 1;
  while (end < lines.length && !nextHeading.test(lines[end])) end++;
  return [...lines.slice(0, start + 1), ...update(lines.slice(start + 1, end)), ...lines.slice(end)].join(newline);
}

function summary(content) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
  const match = frontmatter.match(/^description:[ \t]*(.*)$/m);
  let description = match[1].trim();
  if (/^[>|][-+]?$/.test(description)) {
    description = frontmatter.slice(match.index + match[0].length).match(/^(?:\r?\n[ \t]+[^\r\n]*)+/)?.[0] ?? "";
  }
  description = description.replace(/^(['"])([\s\S]*)\1$/, "$2").replace(/\s+/g, " ").trim();
  if (!description) throw new Error("Skill index requires a nonempty description");
  return description.split(/(?<=\.)\s+/)[0];
}

function rootIndex(content, skills) {
  return section(content, "### Design", (lines) => {
    const header = lines.indexOf("| 關鍵字 | 觸發方式 | 用途 |");
    if (header < 0 || !/^\|(?:\s*:?-+:?\s*\|){3}$/.test(lines[header + 1] ?? "")) {
      throw new Error("Skill index is missing the Design table header");
    }
    const descriptions = new Map();
    let end = header + 2;
    while (end < lines.length && lines[end].startsWith("|")) {
      const row = lines[end].match(/^\| \[\x60([a-z0-9-]+)\x60\]\(skills\/design\/\1\/SKILL\.md\) \| .*? \| (.*) \|$/);
      if (!row) throw new Error(`Unsupported Design index row: ${lines[end]}`);
      descriptions.set(row[1], row[2]);
      end++;
    }
    const rows = skills.map(({ name, content, explicit }) => {
      const description = descriptions.get(name) ?? summary(content).replaceAll("|", "\\|");
      return `| [\`${name}\`](skills/design/${name}/SKILL.md) | ${explicit ? "需明確指定" : "可自動選用"} | ${description} |`;
    });
    return [...lines.slice(0, header + 2), ...rows, ...lines.slice(end)];
  });
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
      const entries = skills.filter((skill) => skill.explicit === explicit).map(({ name, content }) =>
        `- [${name}](./${name}/SKILL.md): ${descriptions.get(name) ?? summary(content)}`);
      return [...lines.slice(0, start), ...entries, ...(entries.length && start === end ? [""] : []), ...lines.slice(end)];
    });
  }
  return content;
}

export function planSkillIndexes(repoRoot, definitions) {
  const skills = definitions.map(({ name, content }) => ({
    name,
    content,
    explicit: /^disable-model-invocation:\s*true\s*$/m.test(content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]),
  })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const planned = new Map();
  for (const [relative, update] of [["README.md", rootIndex], ["skills/design/README.md", categoryIndex]]) {
    const file = path.join(repoRoot, relative);
    if (!existsSync(file)) continue;
    const stat = lstatSync(file);
    if (!stat.isFile()) throw new Error(`Skill index must be a regular file: ${relative}`);
    planned.set(relative, { bytes: Buffer.from(update(readFileSync(file, "utf8"), skills)), mode: stat.mode });
  }
  return planned;
}

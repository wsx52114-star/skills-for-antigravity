export const upstreamRepository = "https://github.com/emilkowalski/skills";
export const destinationPrefix = "skills/design/";

export function runtimeSkillName(sourceName) {
  return sourceName === "prototype" ? "ui-prototype" : sourceName;
}

export function upstreamSkillName(runtimeName) {
  return runtimeName === "ui-prototype" ? "prototype" : runtimeName;
}

export function adaptSkill(content, sourceName) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match || !new RegExp(`^name: ${sourceName}\\s*$`, "m").test(match[1]) ||
      !/^description:\s*\S/m.test(match[1])) {
    throw new Error(`Invalid Emil skill frontmatter: ${sourceName}/SKILL.md`);
  }
  if (sourceName !== "prototype") return content;
  return content.replace(/^name: prototype\s*$/m, "name: ui-prototype");
}

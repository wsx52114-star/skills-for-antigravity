import { loadSources, matchFrontmatter } from "../upstream-sync/lib/snapshot.mjs";

export const upstreamRepository = loadSources()["emil-skills"].repository;
export const destinationCategory = "ui-design";
export const destinationPrefix = `skills/${destinationCategory}/`;

export function runtimeSkillName(sourceName) {
  return sourceName === "prototype" ? "ui-prototype" : sourceName;
}

export function upstreamSkillName(runtimeName) {
  return runtimeName === "ui-prototype" ? "prototype" : runtimeName;
}

export function adaptSkill(content, sourceName) {
  const matched = matchFrontmatter(content);
  if (!matched || !new RegExp(`^name: ${sourceName}\\s*$`, "m").test(matched.body) ||
      !/^description:\s*\S/m.test(matched.body)) {
    throw new Error(`Invalid Emil skill frontmatter: ${sourceName}/SKILL.md`);
  }
  if (sourceName !== "prototype") return content;
  return content.replace(/^name: prototype\s*$/m, "name: ui-prototype");
}

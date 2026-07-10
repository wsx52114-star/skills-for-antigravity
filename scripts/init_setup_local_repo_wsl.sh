# 1. 定義 Skills 倉庫的絕對路徑
SKILLS_REPO="~/skills-for-antigravity"

# 2. 建立專案目錄結構
mkdir -p .agents/rules

# 3. 軟連結技能觸發規則 (skills.md)
ln -sfn "$SKILLS_REPO/rules/skills.md" .agents/rules/skills.md

# 4. 扁平化軟連結所有 Skills 工具組
mkdir -p .agents/skills
find "$SKILLS_REPO/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0 | while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  ln -sfn "$src" ".agents/skills/$name"
done

echo "✅ 技能軟連結完成！"
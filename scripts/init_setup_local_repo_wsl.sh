#!/usr/bin/env bash
set -euo pipefail

# 1. 定義 Skills 倉庫的絕對路徑
SKILLS_REPO="$HOME/skills-for-antigravity"

# 驗證路徑是否存在，如果不存在則報錯退出
if [ ! -d "$SKILLS_REPO" ]; then
  echo "❌ Error: Skills repository directory not found at: $SKILLS_REPO" >&2
  echo "Please check the SKILLS_REPO path defined in this script." >&2
  exit 1
fi

if [ ! -f "$SKILLS_REPO/rules/skills.md" ]; then
  echo "❌ Error: Source rules file not found at: $SKILLS_REPO/rules/skills.md" >&2
  exit 1
fi

# 2. 建立專案目錄結構
mkdir -p .agents

# 3. 複製並翻譯技能觸發規則為專案專屬的 AGENTS.md (替換全域路徑為本機相對路徑)
sed 's|~/.gemini/config/skills/|.agents/skills/|g' "$SKILLS_REPO/rules/skills.md" > .agents/AGENTS.md

# 4. 扁平化軟連結所有 Skills 工具組
mkdir -p .agents/skills
find "$SKILLS_REPO/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0 | while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  ln -sfn "$src" ".agents/skills/$name"
done

echo "✅ 技能軟連結與 AGENTS.md 初始化完成！"
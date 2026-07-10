# 🚀 新專案快速啟用 Agent Skills 指南 (專案獨立版)

這份指南說明如何利用軟連結（Symlink/Junction）方式，在各專案中獨立啟用本倉庫的 Skills 與觸發規則，**完全不污染全域環境**。

因為使用軟連結連結至此倉庫，未來您只需在 "/home/peterxd/skills-for-antigravity" (或對應 Windows 路徑) 內執行 `git pull`，**所有專案都會在一秒內自動同步至最新技能**，不需要重新設定。

---

## 🧹 準備工作 (僅需執行一次)
為了避免舊有的全域設定與專案獨立設定衝突，請先清除全域的 Skills 設定：
* **WSL/Linux**: 執行 `rm -rf ~/.gemini/config/skills && rm -f ~/.gemini/config/AGENTS.md ~/.gemini/config/GEMINI.md`
* **Windows (PowerShell)**: 執行 `Remove-Item -Recurse -Force "$env:USERPROFILE\.gemini\config\skills"` 且清理其底下的 `AGENTS.md`/`GEMINI.md`。

---

## 步驟 1：建立技能與規則連結（在專案根目錄執行）

請根據您的專案運行環境，在該**專案的根目錄下**執行以下指令。

### 💻 選項 A：WSL / Linux 專案 (Bash)
執行本倉庫中的 WSL 啟用腳本：
```bash
# 請將其中的路徑替換為本倉庫在您系統上的實際路徑
bash ~/skills-for-antigravity/scripts/init_setup_local_repo_wsl.sh
```

*(如果您想手動執行，此腳本執行的內容如下：)*
```bash
SKILLS_REPO="$HOME/skills-for-antigravity"
mkdir -p .agents/rules
mkdir -p .agents/skills
ln -sfn "$SKILLS_REPO/rules/skills.md" .agents/rules/skills.md
find "$SKILLS_REPO/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0 | while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  ln -sfn "$src" ".agents/skills/$name"
done
```

### 🪟 選項 B：Windows 本機專案 (PowerShell)
在專案根目錄開啟 PowerShell 並執行（利用 Junction 連結目錄，不需系統管理員權限）：
```powershell
# 請將其中的路徑替換為本倉庫在您 Windows 上的實際路徑
powershell -ExecutionPolicy Bypass -File "C:\path\to\skills-for-antigravity\scripts\init_setup_local_repo_win.ps1"
```

*(如果您想手動執行，此腳本執行的內容如下：)*
```powershell
$SKILLS_REPO = "$HOME\skills-for-antigravity"
New-Item -ItemType Directory -Force -Path ".agents\rules" | Out-Null
New-Item -ItemType Directory -Force -Path ".agents\skills" | Out-Null
$ruleDest = ".agents\rules\skills.md"
if (Test-Path $ruleDest) { Remove-Item -Force $ruleDest }
try {
    New-Item -ItemType SymbolicLink -Force -Path $ruleDest -Value "$SKILLS_REPO\rules\skills.md" -ErrorAction Stop | Out-Null
} catch {
    try {
        New-Item -ItemType HardLink -Force -Path $ruleDest -Value "$SKILLS_REPO\rules\skills.md" -ErrorAction Stop | Out-Null
    } catch {
        Copy-Item -Force -Path "$SKILLS_REPO\rules\skills.md" -Destination $ruleDest
    }
}
Get-ChildItem -Path "$SKILLS_REPO\skills" -Filter "SKILL.md" -Recurse | Where-Object {
    $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "deprecated"
} | ForEach-Object {
    $src = $_.Directory.FullName
    $name = $_.Directory.Name
    $linkPath = ".agents\skills\$name"
    if (Test-Path $linkPath) { Remove-Item -Recurse -Force $linkPath }
    New-Item -ItemType Junction -Path $linkPath -Value $src | Out-Null
}
```

---

## 步驟 2：初始化專案專屬設定（在 AI 對話中執行）

連結建立完成後，開啟與 Antigravity 的對話，並直接輸入以下指令：

> **「幫我初始化這套 skills 的專案設定」**

**Agent 收到後會自動執行：**
1. 詢問您此專案的 Issue Tracker 類型（GitHub / GitLab / 本地 Markdown）與 triage 標籤設定。
2. 讀取 `.agents/rules/skills.md`，並在專案根目錄或 `.agents/` 下**建立客製化的 `AGENTS.md`（會自動將技能路徑轉換為專案內相對路徑 `.agents/skills/...`）**。
3. 在您的專案中建立其他實體檔案：
   - `.agents/CONTEXT.md` （專案專屬的領域術語與定義）。
   - `.agents/docs/agents/` （專案專屬的 Agent 運作設定檔）。

---

## 步驟 3：開始使用

初始化完成後，技能即刻生效。您不需要輸入特別的斜線指令，只需在對話中自然描述需求，例如：
* *「這個功能有 Bug，幫我 **diagnose** 一下。」*
* *「我們用 **tdd** 來寫這個新模組。」*
* *「我要設計一個新 API，請先 **grill me**（拷問我）。」*

---

## 🔄 日後如何同步更新技能？
因為技能本身是用軟連結連過去的，所以未來原作者有更新技能時，您只需要在共享倉庫內執行同步即可，所有專案都會自動吃到最新版：
1. 切換到此倉庫 `/home/peterxd/skills-for-antigravity` (或 Windows 對應路徑)。
2. 執行 `python scripts/sync_upstream.py` 或 `git pull` 取得最新技能更新。

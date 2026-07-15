# 專案 Agent Skills 啟用指南

這份指南說明如何讓開發專案共享 Agent home 的 skills 與 rules，同時保留自己的領域語言與架構決策。

## 目標結構

```text
project/
└── .agents/
    ├── CONTEXT.md
    ├── docs/
    │   └── adr/
    ├── skills -> <Agent home>/skills
    └── rules  -> <Agent home>/rules
```

- `CONTEXT.md` 與 `docs/adr/` 是 project-local 實體內容。
- `skills` 與 `rules` 是機器本機的共享連結，應由 Git 忽略。
- Agent home 執行 `git pull --ff-only` 後，Link Mode 專案立即取得最新版 skills 與 rules。

初始化不需要刪除既有的 Gemini、Antigravity 或其他 Agent 設定。

## WSL／Linux／Raspberry Pi

在目標專案根目錄執行 Agent home 裡的 script：

```bash
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh
```

Script 會從自己的位置判斷 Agent home，因此 repository 不一定要安裝在 `~/.agents`。若安裝於其他位置，改用該 repository 的實際 script 路徑即可。

第一次執行的預期結果：

```text
Created: .agents/CONTEXT.md
Linked: .agents/skills -> <Agent home>/skills
Linked: .agents/rules -> <Agent home>/rules
Agent project initialization complete.
```

再次執行時，正確的檔案與連結會顯示 `Unchanged`。若目的地是錯誤連結、實體目錄或其他未知內容，script 會停止，不會強制替換。

## Windows PowerShell

在目標專案根目錄執行：

```powershell
powershell -ExecutionPolicy Bypass -File "$HOME\.agents\scripts\init_setup_local_repo_win.ps1" -Mode Link
```

可用模式：

| Mode | 行為 | 更新方式 |
| --- | --- | --- |
| `Link` | 將完整的 `skills/` 與 `rules/` 建立成 Junction；建議使用。 | Agent home 更新後立即生效。 |
| `Copy` | 複製完整目錄，適合無法索引 Junction 的 IDE。 | 重新執行 script 以非破壞方式更新檔案。 |

未提供 `-Mode` 時，script 會顯示互動式選單並預設選擇 Link Mode。

Copy Mode 更新既有副本時不會刪除 local 額外檔案，因此上游已移除的舊檔可能仍會保留；需要清理時應先人工確認內容。

## Antigravity 規則入口

Antigravity 會自動載入 workspace 的 `.agents/rules/*.md`。本架構將
`.agents/rules` 連結到 Agent home，並由 `rules/skills.md` 的 `always_on` rule
負責 skills 觸發、`CONTEXT.md` 與 ADR 的讀取規則，因此不需要另外建立
`.agents/AGENTS.md`。

若專案有特殊的 build、test 或修改限制，可由該專案自行維護根目錄
`AGENTS.md` 或 `GEMINI.md`。這些操作規則不應寫入 glossary-only 的
`.agents/CONTEXT.md`，初始化 script 也不會建立或修改它們。

## Git 管理

初始化會建立 `.agents/.gitignore`：

```gitignore
/skills
/rules
```

應納入專案 Git：

```text
.agents/.gitignore
.agents/CONTEXT.md
.agents/docs/adr/**
```

不應使用以下 blanket ignore：

```gitignore
.agents/
.agents
```

若專案根 `.gitignore` 已忽略整個 `.agents/`，WSL script 會提出警告。請改成只忽略機器本機連結，或移除 blanket ignore。

若 `.scratch` 是 local Markdown Issue tracker，可使用：

```gitignore
.scratch/**
!.scratch/**/
!.scratch/**/*.md
```

如此會追蹤 spec 與 issue Markdown，同時忽略 log、cache 與其他 runtime artifacts。

## 更新共享能力

Agent home 使用 Git 管理時，可執行：

```bash
git -C ~/.agents status --short
git -C ~/.agents pull --ff-only
```

Link Mode 不需要重新初始化。Copy Mode 必須重新執行 PowerShell script。

## 安全保證

初始化 scripts 遵守以下規則：

- 不建立或修改專案的 `AGENTS.md`、`GEMINI.md`。
- 不覆寫既有 `CONTEXT.md` 或 ADR。
- 不執行 recursive deletion。
- 正確連結會保持不變。
- 錯誤連結或實體目錄會在寫入前被偵測。
- 不允許從 Agent home 自己的根目錄執行專案初始化。

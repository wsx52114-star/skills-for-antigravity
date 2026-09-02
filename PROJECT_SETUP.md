# 專案 Agent Skills 啟用指南

這份指南說明如何讓開發專案共享 Agent home 的 skills 與 rules，同時保留自己的領域語言與架構決策。

這是 workspace-local 啟用方式，不是將 skills 安裝到 Antigravity 原生的 `~/.gemini/config/skills/` global scope。

## 目標結構

```text
project/
└── .agents/
    ├── CONTEXT.md
    ├── .install-state
    ├── docs/
    │   └── adr/
    ├── skills/
    │   ├── tdd -> <Agent home>/skills/engineering/tdd
    │   ├── i-have-adhd -> <Agent home>/skills/productivity/i-have-adhd
    │   └── <skill-name> -> <Agent home>/skills/<category>/<skill-name>
    └── rules  -> <Agent home>/rules
```

- `CONTEXT.md` 與 `docs/adr/` 是 project-local 實體內容。
- `skills/<skill-name>` 與 `rules` 是機器本機的共享連結，應由 Git 忽略。
- `.install-state` 記錄安裝器管理的 mode、channel、來源與 skill inventory，也應由 Git 忽略。
- Flat skill links 符合 Antigravity 官方 `.agents/skills/<skill-name>/SKILL.md` 結構，可使用 `/skill-name`。
- Agent home 執行 `git pull --ff-only` 後，既有 Link Mode skills 與 rules 立即更新；新增或移除 skill 時需重跑 script 更新 links。

## WSL／Linux／Raspberry Pi

在目標專案根目錄執行：

```bash
# 唯讀檢查；一致時回傳 0，有 drift 時回傳 2
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --check

# 新增缺少的 links，並清理由同一 Agent home 管理的過時 links
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --sync

# 只移除受管理的 skills、rules 與 install state
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --uninstall
```

動作回傳碼：

| 回傳碼 | 意義 |
| --- | --- |
| `0` | `--check` 狀態一致，或寫入動作成功。 |
| `1` | 參數錯誤、路徑衝突或操作失敗。 |
| `2` | `--check` 發現缺少、過時或錯誤的受管理內容。 |

預設 channel 為 `all`，以保留既有行為。若不希望暴露 `skills/in-progress/`：

```bash
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --sync --channel stable
```

Script 會從自身位置判斷 Agent home；若 repository 不在 `~/.agents`，請改用實際 script 路徑。

第一次執行的預期結果：

```text
Created: .agents/CONTEXT.md
Linked: .agents/skills/<skill-name> -> <Agent home>/skills/<category>/<skill-name>
Linked: .agents/rules -> <Agent home>/rules
Agent project initialization complete.
```

再次執行時，正確內容會顯示 `Unchanged`。遇到錯誤連結、實體目錄或未知內容時，script 會停止而不強制替換。

## Windows PowerShell

在目標專案根目錄執行。建議使用 Link Mode：

```powershell
# 同步安裝
powershell -ExecutionPolicy Bypass -File "$HOME\.agents\scripts\init_setup_local_repo_win.ps1" -Action Sync -Mode Link -Channel All

# 唯讀檢查
powershell -ExecutionPolicy Bypass -File "$HOME\.agents\scripts\init_setup_local_repo_win.ps1" -Action Check -Mode Link -Channel All

# 解除安裝受管理內容
powershell -ExecutionPolicy Bypass -File "$HOME\.agents\scripts\init_setup_local_repo_win.ps1" -Action Uninstall -Mode Link
```

可用 `-Action Check|Sync|Uninstall` 與 `-Channel All|Stable`；預設分別為
`Sync` 與 `All`。

可用模式：

| Mode | 行為 | 更新方式 |
| --- | --- | --- |
| `Link` | 為每個 skill 建立 flat Junction，並連結完整 `rules/`；建議使用。 | 既有 skill 在 Agent home 更新後立即生效；skill inventory 變更時重跑 script。 |
| `Copy` | 將每個 skill 扁平複製，適合無法索引 Junction 的 IDE。 | 重新執行 script 以非破壞方式更新檔案。 |

未提供 `-Mode` 時，script 會顯示互動式選單並預設選擇 Link Mode。

Copy Mode 不會刪除 local 額外檔案。若受管理目錄已從 inventory 移除，安裝器會
停止並要求人工檢查，不推測其中是否有本機修改。

## Antigravity 規則入口

Antigravity 會自動載入 workspace 的 `.agents/rules/*.md`。本架構將
`.agents/rules` 連結到 Agent home，並由 `rules/skills.md` 的 `always_on` rule
負責 skills 觸發、`CONTEXT.md` 與 ADR 的讀取規則，因此不需要另外建立
`.agents/AGENTS.md`。

Skills 以 `.agents/skills/<skill-name>/SKILL.md` 的官方 flat layout 接入，因此
可用 `/skill-name`，也可在自然語言中明確提到 skill name。

若專案有特殊的 build、test 或修改限制，可由該專案自行維護根目錄
`AGENTS.md`。這些操作規則不應寫入 glossary-only 的 `.agents/CONTEXT.md`，
初始化 script 也不會建立或修改它。

## Git 管理

初始化會建立 `.agents/.gitignore`：

```gitignore
/skills
/rules
/.install-state
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

這會追蹤 spec 與 issue Markdown，並忽略 log、cache 與其他 runtime artifacts。

安裝器只管理 `.agents/skills`、`.agents/rules`、`.agents/.install-state` 與必要的
`.agents/.gitignore` 規則，不會讀取、寫入或刪除專案的 `.scratch/`。

## 完整安裝與更新生命週期

設定過自動同步的上游 skill 更新會依序經過：

```text
上游 repository 更新
        ↓
GitHub Actions 驗證並建立 review-only Pull Request
        ↓
人工審查與合併
        ↓
Pi5／開發電腦更新共享 Agent home
        ↓
Link Mode 立即取得既有 skill 的新內容
        ↓
各開發專案執行 --check；inventory 有變化時執行 --sync
```

同步 workflow 不會自動合併 Pull Request。只有人工合併並在本機執行
`git pull` 後，開發專案才會取得該次更新。

先更新 Agent home：

```bash
git -C ~/.agents status --short
git -C ~/.agents pull --ff-only
```

再到每個開發專案檢查：

```bash
cd ~/diff-eq-analyzer
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --check
```

更新判斷如下：

| 更新類型 | Link Mode | Copy Mode |
| --- | --- | --- |
| 只修改既有 skill 內容 | `git pull` 後立即生效；`--check` 應回傳 `0`。 | 重新執行 Sync。 |
| 新增、刪除、改名或移動 skill | `--check` 回傳 `2`，執行 `--sync` 重建 links。 | 重新執行 Sync；若偵測到已移除目錄，先人工檢查。 |

`--sync` 可安全地重複執行，因此每次 `git pull` 後也能直接同步所有專案：

```bash
cd ~/diff-eq-analyzer
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --sync

cd ~/Workspace
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --sync
```

Windows Link Mode 使用 `-Action Check`／`-Action Sync`；Copy Mode 每次 Agent home
更新後都使用 `-Action Sync -Mode Copy`。

## 安全保證

初始化 scripts 遵守以下規則：

- 不建立或修改專案的 `AGENTS.md`。
- 不覆寫既有 `CONTEXT.md` 或 ADR。
- Link Mode 不會遞迴刪除資料；Copy Mode 只會在明確解除安裝時移除安裝器管理的目錄。
- 正確連結會保持不變。
- `--check` 不會寫入專案；缺少或過時時回傳 2。
- 同步只清理由目前 Agent home 擁有的 links，並保留未知的 project-local skills。
- 解除安裝不會移除 `CONTEXT.md`、ADR 或 `AGENTS.md`。
- 錯誤連結或實體目錄會在寫入前被偵測。
- 不允許從 Agent home 自己的根目錄執行專案初始化。

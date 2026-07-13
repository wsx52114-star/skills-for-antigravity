# Skills for Antigravity

一套供 Antigravity 使用的全域工程 skills。它承襲 [`mattpocock/skills`](https://github.com/mattpocock/skills) 的工作流程，保留原始 skill 內容，並加入 Antigravity rules 與 `security-audit`。

Repository 可直接安裝到 `~/.agents`。各開發專案則保有自己的領域語言、架構決策與程式碼。

## 內容

| 路徑 | 用途 |
| --- | --- |
| [`skills/`](skills/) | 可由 Antigravity 呼叫的工程、生產力、工具與安全 skills。 |
| [`rules/`](rules/) | Skill 觸發、工作流程與 Antigravity 轉譯規則。 |
| [`docs/`](docs/) | 各 skills 的使用與開發參考。 |
| [`.github/upstream-sync/`](.github/upstream-sync/) | 上游快照、所有權 policy、驗證與測試。 |
| [`CONTEXT.md`](CONTEXT.md) | 本專案的標準術語與關係範例。 |

上游的 Claude-only、deprecated 與發布工具不會進入可用 skills。自訂 [`security-audit`](skills/security/security-audit/SKILL.md) 由本專案獨立維護。

本專案支援兩種安裝方式：**全域安裝**（將 repository 安裝成 Agent home）與**專案連結**（讓專案使用共享 skills 與 rules，同時保留自己的 context 與 ADR）。

### 🔌 方式 A：全域安裝 (將本 repo 安裝至全域 `~/.agents`)

**Windows：**
```powershell
git clone https://github.com/wsx52114-star/skills-for-antigravity.git "$HOME\.agents"
```

**WSL／Raspberry Pi 5：**
```bash
git clone https://github.com/wsx52114-star/skills-for-antigravity.git ~/.agents
```

如果目標目錄已存在，先備份並確認內容。

---

### 📂 方式 B：專案連結

此方式利用 Symlink／Junction 共享 Agent home 的 skills 與 rules。每個專案的 `AGENTS.md`、`CONTEXT.md` 與 ADR 仍是 local 實體檔案。詳細步驟見 [專案啟用指南](README_LOCAL.md)。

| 目錄路徑 | 用途 | 存放層級 |
|------|------|---|
| **專案** `.agents/AGENTS.md` | 專案專屬的 Agent 規則與 Golden Workflow。 | 專案實體目錄 (自動產生) |
| **專案** `.agents/CONTEXT.md` | 專案領域語言。 | 專案實體檔案 (隔離) |
| **專案** `.agents/docs/adr/` | 專案架構決策。 | 專案實體目錄 (隔離) |
| **專案** `.agents/skills` | 指向 Agent home 的 `skills/`。 | 機器本機連結 |
| **專案** `.agents/rules` | 指向 Agent home 的 `rules/`。 | 機器本機連結 |

#### 快速啟用指令：
* **WSL/Linux 專案**：在專案根目錄執行：
  ```bash
  bash ~/.agents/scripts/init_setup_local_repo_wsl.sh
  ```
* **Windows 專案**：在專案根目錄開啟 PowerShell 執行：
  ```powershell
  powershell -ExecutionPolicy Bypass -File "$HOME\.agents\scripts\init_setup_local_repo_win.ps1" -Mode Link
  ```

維護原則：

- 新增或更新全域技能時，先確認 `~/.agents/rules/skills.md` 的觸發描述是否同步。
- 專案特定的新 ADR 應放在各開發專案的 `.agents/docs/adr/`，不要放在 Agent home。
- 各專案的 `.agents/CONTEXT.md` 是該專案領域語言的權威來源。
- `~/.agents/scripts/` 只放 agent workflow 輔助腳本，不放專案 runtime 腳本。



## 更新

Windows：

```powershell
git -C "$HOME\.agents" pull --ff-only
```

WSL／Raspberry Pi 5：

```bash
git -C ~/.agents pull --ff-only
```

## 使用 skills

直接用自然語言描述需求。Antigravity 會依 skill description 選擇工作流程，並在執行前讀取對應的 `SKILL.md`。

例如：

- 「這個 API 一直失敗，請幫我 diagnose。」
- 「用 TDD 實作登入流程。」
- 「先做 domain modeling，把術語釐清。」
- 「用 grill-with-docs 挑戰這個設計。」
- 「對這個 repository 做 security audit。」

## 核心工作流程

| Skill | 用途 |
| --- | --- |
| `diagnosing-bugs` | 重現、縮小範圍、驗證假設並修復問題。 |
| `domain-modeling` | 維護專案術語、關係與必要的 ADR。 |
| `grill-with-docs` | 透過追問釐清設計並同步領域文件。 |
| `to-spec` | 將已確認的討論整理成規格。 |
| `to-tickets` | 將規格切成具有阻擋關係的工作項目。 |
| `implement`、`tdd` | 依規格實作並以測試驗證行為。 |
| `code-review` | 依 Standards 與 Spec 兩軸審查變更。 |
| `security-audit` | 尋找、驗證並記錄可利用的安全問題。 |

常見工程流程：

```text
grill-with-docs → to-spec → to-tickets → implement / tdd → code-review
```

各 skill 的行為以自己的 `SKILL.md` 為準；[`rules/skills.md`](rules/skills.md) 負責全域觸發、編排與 Antigravity 轉譯。

## 專案文件

每個開發專案自行保存：

```text
project/
├── .agents/
│   ├── AGENTS.md
│   ├── CONTEXT.md
│   ├── docs/adr/
│   ├── skills -> Agent home/skills
│   └── rules  -> Agent home/rules
└── src/
```

`.agents/CONTEXT.md` 是專案術語表；`.agents/docs/adr/` 只記錄難以逆轉、具有真實取捨且缺少背景會令人意外的決策。初始化 script 不會覆寫既有 local 文件。

## 維護

自動同步與驗證方式見 [MAINTENANCE.md](MAINTENANCE.md)，上游各項目的承襲理由見 [UPSTREAM_ANALYSIS.md](UPSTREAM_ANALYSIS.md)。上游授權保留於 [LICENSE](LICENSE)。

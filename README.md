# Skills for Antigravity

一套供 Antigravity 使用的全域工程 skills。它承襲 [`mattpocock/skills`](https://github.com/mattpocock/skills) 的工作流程，保留原始 skill 內容，並加入 Antigravity rules 與 `security-audit`。

Repository 可直接安裝到 `~/.agents`。各開發專案則保有自己的領域語言、架構決策與程式碼。

## 內容

| 路徑 | 用途 |
| --- | --- |
| [`skills/`](skills/) | 可由 Antigravity 呼叫的工程、生產力、工具與安全 skills。 |
| [`rules/`](rules/) | Skill 觸發、工作流程與 Antigravity 轉譯規則。 |
| [`docs/`](docs/) | 各 skills 的使用與開發參考。 |
| [`.github/upstream-sync/`](.github/upstream-sync/) | `mattpocock/skills` 上游快照、所有權 policy、驗證與測試。 |
| [`.github/security-audit-sync/`](.github/security-audit-sync/) | Cloudflare `security-audit` 的獨立同步 control plane。 |
| [`PROJECT_SETUP.md`](PROJECT_SETUP.md) | 開發專案連結 Agent home 的完整設定指南。 |
| [`CONTEXT.md`](CONTEXT.md) | 本專案的標準術語與關係範例。 |

上游的 Claude-only、deprecated 與發布工具不會進入可用 skills。[`security-audit`](skills/security/security-audit/SKILL.md) 則由獨立 Action 同步自 [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill)，所有更新均須經 Pull Request 人工審查。

## 安裝

### 全域安裝

Windows：

```powershell
git clone https://github.com/wsx52114-star/skills-for-antigravity.git "$HOME\.agents"
```

WSL／Raspberry Pi 5：

```bash
git clone https://github.com/wsx52114-star/skills-for-antigravity.git ~/.agents
```

如果目標目錄已存在，先備份並確認內容。

### 專案連結

開發專案可透過 Symlink／Junction 共用 Agent home 的 skills 與 rules，同時保留
project-local 的 `CONTEXT.md` 與 ADR。WSL、Linux、Raspberry Pi、
Windows、Link／Copy Mode、Git ignore 與安全行為詳見
[專案 Agent Skills 啟用指南](PROJECT_SETUP.md)。
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

每個開發專案自行保存 `.agents/CONTEXT.md` 與 `.agents/docs/adr/`；共享的 skills
與 rules 僅以機器本機連結接入。專案若需要特殊操作規則，可自行維護根目錄
`AGENTS.md` 或 `GEMINI.md`。完整目錄結構與 Git 管理方式見
[PROJECT_SETUP.md](PROJECT_SETUP.md)。

## 維護

上游採用政策、自動同步與驗證方式見 [MAINTENANCE.md](MAINTENANCE.md)。上游授權保留於 [LICENSE](LICENSE)。

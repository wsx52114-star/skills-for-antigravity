# 上游承襲分析

上游：[`mattpocock/skills`](https://github.com/mattpocock/skills)

基準：`391a2701dd948f94f56a39f7533f8eea9a859c87`

## 結論

本專案接收適用的上游 skills、開發文件與授權，並自行維護 Antigravity rules、自動同步流程及 `security-audit`。

Claude-only、deprecated 與上游發布工具不納入 `~/.agents`。

## 第一層項目

| 上游項目 | 處理方式 | 原因 |
| --- | --- | --- |
| `.agents/` | 排除 | 避免 nested `.agents`。 |
| `.changeset/` | 排除 | 只管理上游版本與 changelog。 |
| `.claude-plugin/` | 排除 | 只供 Claude plugin 封裝。 |
| `.github/workflows/` | 自行維護 | 本專案有獨立同步與驗證流程。 |
| `.out-of-scope/` | 排除 | 上游已標示不在正式技能範圍。 |
| `docs/` | 同步 | 接收技能文件；保護 `docs/security/`。 |
| `scripts/` | 排除 | 只服務上游維護，本專案使用自己的同步工具。 |
| `skills/` | 選擇性同步 | 排除 Claude-only、deprecated；保護 `skills/security/`。 |
| `.gitignore` | 自行維護 | 必須符合本專案的目錄與維護工具。 |
| `CHANGELOG.md` | 排除 | 只記錄上游發版，不代表本專案變更。 |
| `CLAUDE.md` | 排除 | Claude 專用規則。 |
| `CONTEXT.md` | 自行維護 | 必須描述本專案的術語與架構邊界。 |
| `LICENSE` | 同步 | 保留上游授權。 |
| `README.md` | 自行維護 | 必須提供本專案的安裝與更新方式。 |
| `package-lock.json` | 排除 | 只鎖定上游 Changesets 工具。 |
| `package.json` | 排除 | 只供上游 Changesets 與發版流程。 |

## 檔案來源

- 適用的上游 `SKILL.md` 與技能內容保持原文；分類 README 只移除被排除技能的索引列。
- `docs/**` 除 `docs/security/**` 外保持上游內容。
- `skills/security/**` 與 `docs/security/**` 是本專案安全性擴充。
- `rules/**` 是本專案的 Antigravity 轉譯與編排層。

## 更新模型

1. Shallow fetch 上游最新 commit。
2. 依 allowlist、排除規則與所有權邊界產生快照。
3. 記錄 commit 與檔案清單。
4. 測試後建立 Pull Request。
5. 結構變更與所有權衝突必須人工審查。

## ADR

原作者仍使用 ADR，但只在實際專案出現難以逆轉、具有真實取捨的決策時，才建立 `docs/adr/`。

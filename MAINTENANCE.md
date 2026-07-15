# Maintenance

## 上游來源

| 上游 | 接收內容 | 版本紀錄 | 自動更新 |
| --- | --- | --- | --- |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | 適用的 skills、開發文件與授權 | [upstream lock](.github/upstream-sync/upstream-lock.json) | [sync-upstream.yml](.github/workflows/sync-upstream.yml) |
| [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill) | `security-audit` 與其授權 | [security-audit lock](.github/security-audit-sync/upstream-lock.json) | [sync-security-audit.yml](.github/workflows/sync-security-audit.yml) |

兩份 lock 是目前採用版本與檔案 inventory 的權威來源；維護文件不另存固定
baseline SHA。

## `mattpocock/skills` 採用政策

從 `mattpocock/skills` 接收：

```text
skills/**
docs/**
LICENSE
```

不接收上游的 `.agents/`、`.changeset/`、`.claude-plugin/`、`.out-of-scope/`、`scripts/`、root package files、根目錄說明文件與發布 workflows。

Claude-only 與 deprecated skills 在匯入階段排除；分類 README 中對應的索引列也會移除。

| 上游項目 | 處理方式 | 原因 |
| --- | --- | --- |
| `.agents/` | 排除 | 避免 nested `.agents`。 |
| `.changeset/` | 排除 | 只管理上游版本與 changelog。 |
| `.claude-plugin/` | 排除 | 只供 Claude plugin 封裝。 |
| `.github/workflows/` | 自行維護 | 本專案有獨立同步與驗證流程。 |
| `.out-of-scope/` | 排除 | 上游已標示不在正式技能範圍。 |
| `docs/` | 同步 | 接收 skill 文件；保護 `docs/security/`。 |
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

適用的上游 `SKILL.md` 與 skill 內容保持原文；分類 README 只移除被排除
skill 的索引列。`docs/**` 除 `docs/security/**` 外保持上游內容。

## Cloudflare `security-audit` 同步範圍

`security-audit` 由另一條獨立同步流程從 `cloudflare/security-audit-skill` 接收：

```text
LICENSE → skills/security/security-audit/LICENSE
skills/security-audit/** → skills/security/security-audit/**
```

`skills/security/README.md` 與 `docs/security/**` 仍由本專案維護。

## 所有權

[`.github/upstream-sync/ownership.json`](.github/upstream-sync/ownership.json) 定義 allowlist、排除項目與 fork-owned paths。

以下路徑不接受 `mattpocock/skills` 更新：

- `rules/**`
- `skills/security/**`
- `docs/security/**`
- `.github/upstream-sync/**`
- `.github/workflows/**`
- 根目錄文件

其中 `skills/security/security-audit/**` 由
[`.github/security-audit-sync/`](.github/security-audit-sync/) 單獨管理；
`skills/security/README.md` 仍由本專案維護。

## 架構約束

- Repository 根目錄不得包含 nested `.agents/`。
- 上游更新只能寫入 allowlist。
- Claude-only 與 deprecated skills 不得進入 runtime。
- 專案的 `CONTEXT.md` 與 `docs/adr/` 必須留在該專案。
- Runtime skill 的新增、刪除、改名或移動必須人工審查。
- 所有 upstream 同步 Pull Request 都必須人工審查，不得 auto-merge。
- `rules/skills.md` 必須保持在 12,000 字元內，並由 rules contract test 檢查舊路徑與名稱。

## 自動更新

[`.github/workflows/sync-upstream.yml`](.github/workflows/sync-upstream.yml) 每日或手動執行：

1. Shallow fetch 最新 `upstream/main`。
2. 套用允許的檔案並更新 upstream lock。
3. 執行測試與 repository validation。
4. 建立同步 Pull Request。
5. 等待人工審查與合併；content-only 更新也不例外。

上游 commit 記錄在 [`.github/upstream-sync/upstream-lock.json`](.github/upstream-sync/upstream-lock.json)。

[`.github/workflows/sync-security-audit.yml`](.github/workflows/sync-security-audit.yml)
每日或手動檢查 Cloudflare 上游，驗證 snapshot 僅含一般檔案後，套用到獨立
ownership 邊界並建立 Pull Request。此流程同樣不會 auto-merge；每次更新都必須
人工審查。

Cloudflare commit 與檔案 inventory 記錄在
[`.github/security-audit-sync/upstream-lock.json`](.github/security-audit-sync/upstream-lock.json)。

## GitHub 設定

- `Settings → Actions → General`：允許 GitHub Actions 建立 Pull Request。
- Sync job 會在建立 PR 前完成測試，但不會自動合併。若 ruleset 要求另一個 PR
  check，需為 bot PR 提供 GitHub App／PAT，或人工核准該 workflow run。

## 驗證

維護者需要 Node.js 22+：

```bash
node --test .github/upstream-sync/tests/*.test.mjs
node .github/upstream-sync/validate.mjs
```

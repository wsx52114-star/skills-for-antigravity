# Maintenance

## 同步範圍

從 `mattpocock/skills` 接收：

```text
skills/**
docs/**
LICENSE
```

不接收上游的 `.agents/`、`.changeset/`、`.claude-plugin/`、`.out-of-scope/`、`scripts/`、root package files、根目錄說明文件與發布 workflows。

Claude-only 與 deprecated skills 在匯入階段排除；分類 README 中對應的索引列也會移除。

## 所有權

[`.github/upstream-sync/ownership.json`](.github/upstream-sync/ownership.json) 定義 allowlist、排除項目與 fork-owned paths。

以下路徑只由本專案維護：

- `rules/**`
- `skills/security/**`
- `docs/security/**`
- `.github/upstream-sync/**`
- `.github/workflows/**`
- 根目錄文件

## 架構約束

- Repository 根目錄不得包含 nested `.agents/`。
- 上游更新只能寫入 allowlist。
- Claude-only 與 deprecated skills 不得進入 runtime。
- 專案的 `CONTEXT.md` 與 `docs/adr/` 必須留在該專案。
- Runtime skill 的新增、刪除、改名或移動必須人工審查。
- `rules/skills.md` 必須保持在 12,000 字元內，並由 rules contract test 檢查舊路徑與名稱。

## 自動更新

[`.github/workflows/sync-upstream.yml`](.github/workflows/sync-upstream.yml) 每日或手動執行：

1. Shallow fetch 最新 `upstream/main`。
2. 套用允許的檔案並更新 upstream lock。
3. 執行測試與 repository validation。
4. 建立同步 Pull Request。
5. 既有 skill 內已修改的 Markdown 可自動合併；其他變更等待人工審查。

上游 commit 記錄在 [`.github/upstream-sync/upstream-lock.json`](.github/upstream-sync/upstream-lock.json)。

## GitHub 設定

- `Settings → Actions → General`：允許 GitHub Actions 建立 Pull Request。
- `Settings → General → Pull Requests`：啟用 squash merging 與 auto-merge。
- Sync job 會在建立 PR 前完成測試；若 ruleset 要求另一個 PR check，需為 bot PR 提供 GitHub App／PAT，或人工核准該 workflow run。

## 驗證

維護者需要 Node.js 22+：

```bash
node --test .github/upstream-sync/tests/*.test.mjs
node .github/upstream-sync/validate.mjs
```

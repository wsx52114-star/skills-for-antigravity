# Maintenance

## 上游來源

| 上游 | 接收內容 | 版本紀錄 | 自動更新 |
| --- | --- | --- | --- |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | 適用的 skills、開發文件與授權 | [upstream lock](.github/upstream-sync/upstream-lock.json) | [sync-upstream.yml](.github/workflows/sync-upstream.yml) |
| [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill) | `security-audit` 與其授權 | [security-audit lock](.github/security-audit-sync/upstream-lock.json) | [sync-security-audit.yml](.github/workflows/sync-security-audit.yml) |
| [`ayghri/i-have-adhd`](https://github.com/ayghri/i-have-adhd) | explicit-only `i-have-adhd` 與其授權 | [i-have-adhd lock](.github/i-have-adhd-sync/upstream-lock.json) | [sync-i-have-adhd.yml](.github/workflows/sync-i-have-adhd.yml) |
| [`frank890417/taiwan-md`](https://github.com/frank890417/taiwan-md) | 正規化 Taiwan.md 用語快照 | [Taiwan.md lock](.github/taiwan-terminology-sync/upstream-lock.json) | [sync-taiwan-terminology.yml](.github/workflows/sync-taiwan-terminology.yml) |

四份 lock 是目前採用版本與檔案 inventory 的權威來源；本文件不另存固定
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

| 上游內容 | 處理方式 | 原因 |
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

## `i-have-adhd` 同步範圍

`LICENSE` 與 `skills/i-have-adhd/**` 會同步到
`skills/productivity/i-have-adhd/`。Adapter 固定加入
`disable-model-invocation: true` 並將 Codex policy 設為
`allow_implicit_invocation: false`；其餘內容維持 upstream snapshot。

## Taiwan.md 詞庫同步範圍

`taiwan-term` 的 skill 流程與掃描器由本專案維護。獨立同步流程僅讀取
Taiwan.md 的 `README.md` 與 `data/terminology/*.yaml`，產生固定 commit 的
正規化 JSON 快照；Runtime skill 執行時不連線到上游。快照保留 Taiwan.md
來源、版本與 CC BY-SA 4.0 授權資訊。

## 所有權

[`.github/upstream-sync/ownership.json`](.github/upstream-sync/ownership.json) 定義 allowlist、排除規則與 fork-owned paths。

以下路徑不接受 `mattpocock/skills` 更新：

- `rules/**`
- `skills/language/**`
- `skills/security/**`
- `skills/productivity/i-have-adhd/**`
- `docs/security/**`
- `.github/upstream-sync/**`
- `.github/taiwan-terminology-sync/**`
- `.github/workflows/**`
- 根目錄說明文件

其中 `skills/security/security-audit/**` 由
[`.github/security-audit-sync/`](.github/security-audit-sync/) 單獨管理；
`skills/security/README.md` 仍由本專案維護。
`skills/productivity/i-have-adhd/**` 則由
[`.github/i-have-adhd-sync/`](.github/i-have-adhd-sync/) 單獨管理。
`skills/language/taiwan-term/**` 的 skill 邏輯由本專案維護，詞庫資料則由
[`.github/taiwan-terminology-sync/`](.github/taiwan-terminology-sync/) 正規化更新。

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

同步分支存在時，workflow 仍會更新該分支，並以 REST 查詢是否已有 open PR；只有
open PR 存在才沿用它。已關閉 PR 留下的遠端分支不會阻止重新建立 review-only PR。

上游 commit 記錄在 [`.github/upstream-sync/upstream-lock.json`](.github/upstream-sync/upstream-lock.json)。

[`.github/workflows/sync-security-audit.yml`](.github/workflows/sync-security-audit.yml)
每日或手動檢查 Cloudflare 上游，驗證 snapshot 僅含一般檔案後，套用到獨立
ownership 邊界並建立 Pull Request。此流程同樣不會 auto-merge；每次更新都必須
人工審查。

Cloudflare commit 與檔案 inventory 記錄在
[`.github/security-audit-sync/upstream-lock.json`](.github/security-audit-sync/upstream-lock.json)。

[`sync-i-have-adhd.yml`](.github/workflows/sync-i-have-adhd.yml) 每日或手動檢查
`ayghri/i-have-adhd`，套用 explicit-only adapter 後建立需人工審查的 Pull Request。

[`sync-taiwan-terminology.yml`](.github/workflows/sync-taiwan-terminology.yml) 每週或手動
檢查 Taiwan.md，驗證詞庫格式、重新產生固定快照，並建立需人工審查的 Pull Request。

## GitHub 設定

- 建立 [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)，
  repository access 僅選擇此 repository，repository permission 僅將
  `Pull requests` 設為 `Read and write`。
- 到 `Settings → Secrets and variables → Actions` 建立
  [repository secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
  `SYNC_PR_TOKEN`，值為上述 token。四個同步 workflow 只在建立 review-only PR
  的 step 使用此 secret；同步分支仍由權限限縮為 `contents: write` 的
  `GITHUB_TOKEN` 推送。
- PR step 直接呼叫 REST `POST /repos/{owner}/{repo}/pulls`，不使用會額外要求
  `Contents: read` 的 `gh pr create` GraphQL 路徑；`SYNC_PR_TOKEN` 不需要
  `Contents` permission。
- Token 到期或撤銷後必須更新 `SYNC_PR_TOKEN`；workflow 若找不到 secret，會在
  呼叫 GitHub API 前以明確錯誤停止。
- Sync job 會在建立 PR 前完成測試，但不會自動合併。若 ruleset 要求另一個 PR
  check，需為 bot PR 提供 GitHub App／PAT，或人工核准該 workflow run。

## 驗證

維護者需要 Node.js 22+、Git 與 Python 3.10+。Linux／WSL 安裝器測試另需要
Bash 4+、GNU coreutils、find、grep 與 awk。Windows 的 PowerShell 測試支援
Windows PowerShell 5.1 與 PowerShell 7。

```bash
node --test .github/upstream-sync/tests/*.test.mjs
node .github/upstream-sync/validate.mjs
```

Windows 的 Node 測試會明確略過 POSIX 安裝器案例；這些案例必須在 Linux／WSL
執行，不能用 Windows 的通過結果代替。Windows 另執行：

```powershell
powershell -NoProfile -File .github/upstream-sync/tests/local-setup-win.test.ps1
powershell -NoProfile -File .github/upstream-sync/tests/local-setup-win-safety.test.ps1
pwsh -NoProfile -File .github/upstream-sync/tests/local-setup-win.test.ps1
pwsh -NoProfile -File .github/upstream-sync/tests/local-setup-win-safety.test.ps1
```

Python 測試預設在 Windows 呼叫 `python`，在 Linux 呼叫 `python3`。若執行檔不在
PATH，可將 `PYTHON` 環境變數設為完整執行檔路徑；測試會使用 UTF-8 輸出，避免
Windows 主控台編碼影響中文案例。CI 在 Ubuntu 執行完整 POSIX 測試，在 Windows
執行 Node 測試、repository validation 與兩個 PowerShell 版本的安裝測試。

`.gitattributes` 固定 Bash scripts 與詞庫快照使用 LF，快照產生器也固定輸出 LF。
既有 checkout 若尚未套用換行政策，先確認沒有本機內容修改，再只將上述檔案
轉為 LF；不要為了通過驗證改寫 lock 的 hash。

三個 JavaScript snapshot adapters 共用 regular-file 與完整 commit SHA 驗證，
在寫入前拒絕 symlink 與不支援的檔案型別。Taiwan.md 的 Python adapter 保持
詞庫專用的來源驗證。更新共用契約時，執行 `snapshot-input.test.mjs` 與既有
各 adapter 的成功／失敗案例。

Skill 的實際觸發與停止行為，依 [skill 情境驗證](.github/skill-evals/README.md)
在 Antigravity 執行。這項驗證與 CI 的文字契約檢查分開記錄；沒有執行紀錄時，
結果就是「未驗證」。

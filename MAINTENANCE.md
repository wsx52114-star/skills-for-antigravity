# Maintenance

## 上游來源

| 上游 | 接收內容 | 版本紀錄 | 自動更新 |
| --- | --- | --- | --- |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | 適用的 skills、開發文件與授權 | [upstream lock](.github/upstream-sync/upstream-lock.json) | [Sync All Skills](.github/workflows/sync-skills.yml) |
| [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill) | `security-audit` 與其授權 | [security-audit lock](.github/security-audit-sync/upstream-lock.json) | [Sync All Skills](.github/workflows/sync-skills.yml) |
| [`ayghri/i-have-adhd`](https://github.com/ayghri/i-have-adhd) | explicit-only `i-have-adhd` 與其授權 | [i-have-adhd lock](.github/i-have-adhd-sync/upstream-lock.json) | [Sync All Skills](.github/workflows/sync-skills.yml) |
| [`emilkowalski/skills`](https://github.com/emilkowalski/skills) | 設計與介面 skills、參考文件與 MIT 授權 | [Emil skills lock](.github/emil-skills-sync/upstream-lock.json) | [Sync All Skills](.github/workflows/sync-skills.yml) |
| [`frank890417/taiwan-md`](https://github.com/frank890417/taiwan-md) | 正規化 Taiwan.md 用語快照 | [Taiwan.md lock](.github/taiwan-terminology-sync/upstream-lock.json) | [Sync All Skills](.github/workflows/sync-skills.yml) |

五份 lock 是目前採用版本與檔案 inventory 的權威來源；本文件不另存固定
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
| `skills/` | 選擇性同步 | 排除 Claude-only、deprecated；保護 `skills/security/` 與其他獨立來源。 |
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

`security-audit` 由統一同步流程呼叫專屬 adapter，從 `cloudflare/security-audit-skill` 接收：

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

`taiwan-term` 的 skill 流程與掃描器由本專案維護。專屬 adapter 僅讀取
Taiwan.md 的 `README.md` 與 `data/terminology/*.yaml`，產生固定 commit 的
正規化 JSON 快照；Runtime skill 執行時不連線到上游。快照保留 Taiwan.md
來源、版本與 CC BY-SA 4.0 授權資訊。

## Emil 設計與介面 skills 同步範圍

`emilkowalski/skills` 的 `skills/*/**` 匯入 `skills/design/*/**`，包含
各技能的參考文件。根目錄 MIT `LICENSE` 複製到每個技能目錄，讓專案使用
Copy Mode 時仍保留授權。上游的根目錄說明文件、設定與其他工具不匯入。

來源 `prototype` 對應到本專案 `ui-prototype`，僅調整 frontmatter name；
原 Engineering `prototype` 保留。`rules/skills.md` 將這套來源文件中的技能
`prototype` 參照解析為 `ui-prototype`。其餘技能內容與觸發設定維持上游原文。

`skills/design/README.md` 由本專案維護，adapter 不覆寫。
新增、移除技能時須同步調整根目錄 README，再通過 inventory validation。

## 所有權

[`.github/upstream-sync/ownership.json`](.github/upstream-sync/ownership.json) 定義 allowlist、排除規則與 fork-owned paths。

以下路徑不接受 `mattpocock/skills` 更新：

- `rules/**`
- `skills/language/**`
- `skills/design/**`
- `skills/security/**`
- `skills/productivity/i-have-adhd/**`
- `docs/security/**`
- `.github/upstream-sync/**`
- `.github/taiwan-terminology-sync/**`
- `.github/emil-skills-sync/**`
- `.github/skill-sync/**`
- `.github/workflows/**`
- 根目錄說明文件

其中 `skills/security/security-audit/**` 由
[`.github/security-audit-sync/`](.github/security-audit-sync/) 單獨管理；
`skills/security/README.md` 仍由本專案維護。
`skills/productivity/i-have-adhd/**` 則由
[`.github/i-have-adhd-sync/`](.github/i-have-adhd-sync/) 單獨管理。
`skills/language/taiwan-term/**` 的 skill 邏輯由本專案維護，詞庫資料則由
[`.github/taiwan-terminology-sync/`](.github/taiwan-terminology-sync/) 正規化更新。
`skills/design/**` 的上游技能由 [`.github/emil-skills-sync/`](.github/emil-skills-sync/)
獨立管理。

## 架構約束

- Repository 根目錄不得包含 nested `.agents/`。
- 上游更新只能寫入 allowlist。
- Claude-only 與 deprecated skills 不得進入 runtime。
- 專案的 `CONTEXT.md` 與 `docs/adr/` 必須留在該專案。
- Runtime skill 的新增、刪除、改名或移動必須人工審查。
- 所有 upstream 同步 Pull Request 都必須人工審查，不得 auto-merge。
- `rules/skills.md` 必須保持在 12,000 字元內，並由 rules contract test 檢查舊路徑與名稱。

## 自動更新

[`Sync All Skills`](.github/workflows/sync-skills.yml) 是唯一排程入口，每週一台灣
時間 08:00 檢查全部五個來源。來源與同步參數集中於
[`.github/skill-sync/sources.json`](.github/skill-sync/sources.json)。

1. 每週排程檢查全部來源；手動執行可選單一來源或全部來源。
2. 以 matrix 呼叫共用的 [`sync-source.yml`](.github/workflows/sync-source.yml)。
3. 各 job 比對來源最新 commit 與自己的 lock；相同時跳過後續處理。
4. 有更新時驗證快照、呼叫該來源 adapter、執行完整測試與 repository validation。
5. 推送各來源的同步分支，建立或沿用 review-only PR，等待人工審查與合併。

不同來源可並行，`fail-fast: false` 讓單一來源失敗不取消其他來源；同一來源
使用共用 concurrency group，排程與手動執行會排隊。每個 job 的 summary
顯示最新 commit 與是否有更新。統一入口減少重複維護，各來源仍須各自查詢。

來源 adapter、lock 與所有權邊界保持獨立；`mattpocock/skills` 保留 collision
分類與保護。沒有更新的來源不會使用 `SYNC_PR_TOKEN`。

原本各來源的 sync workflows 已移除。手動更新請在 Actions 選擇
`Sync All Skills → Run workflow`，再從 `source` 選擇 `all` 或單一來源。
[`sync-source.yml`](.github/workflows/sync-source.yml) 僅供統一入口呼叫。

同步分支存在時仍會更新，並以 REST 查詢 open PR；已關閉 PR 留下的遠端
分支不會阻止重新建立 review-only PR。所有來源均不會 auto-merge；runtime
詞庫掃描也不會讀取移動中的上游 branch。

## GitHub 設定

- 建立 [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)，
  repository access 僅選擇此 repository，repository permission 僅將
  `Pull requests` 設為 `Read and write`。
- 到 `Settings → Secrets and variables → Actions` 建立
  [repository secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
  `SYNC_PR_TOKEN`，值為上述 token。共用同步 job 只在建立 review-only PR
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

四個 JavaScript snapshot adapters 共用 regular-file 與完整 commit SHA 驗證，
在寫入前拒絕 symlink 與不支援的檔案型別。Taiwan.md 的 Python adapter 保持
詞庫專用的來源驗證。更新共用契約時，執行 `snapshot-input.test.mjs` 與既有
各 adapter 的成功／失敗案例。

Skill 行為實測與 CI 的靜態契約檢查分開判定，Codex 擴充與 Antigravity 原生 Agent
的結果也不能互相替代。未執行或略過的案例不代表通過。

2026-09-08：Codex 擴充 E01、E02 通過，E03 僅主專案變體通過；標準 E03、
E04～E06 與原生 Agent 測試依維護者決定略過，已移除本次情境測試文件。

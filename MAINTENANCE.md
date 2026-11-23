# Maintenance

本文件分為兩大部分：

- **[第一部分：架構與同步政策（說明）](#第一部分架構與同步政策說明)** — 解釋上游來源、採用邊界、所有權規則與自動更新原理。
- **[第二部分：實作與驗證操作（可動手執行）](#第二部分實作與驗證操作可動手執行)** — 維護者與使用者實際需要設定或執行的操作步驟。

---

## 第一部分：架構與同步政策（說明）

### 上游來源與鎖定檔

| 上游 | 接收內容 | 版本紀錄（權威來源） |
| --- | --- | --- |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | 適用的 skills、開發文件與授權 | [upstream lock](.github/upstream-sync/upstream-lock.json) |
| [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill) | `security-audit` 與其授權 | [security-audit lock](.github/security-audit-sync/upstream-lock.json) |
| [`ayghri/i-have-adhd`](https://github.com/ayghri/i-have-adhd) | explicit-only `i-have-adhd` 與其授權 | [i-have-adhd lock](.github/i-have-adhd-sync/upstream-lock.json) |
| [`emilkowalski/skills`](https://github.com/emilkowalski/skills) | UI 設計與介面 skills、參考文件與 MIT 授權 | [Emil skills lock](.github/emil-skills-sync/upstream-lock.json) |
| [`frank890417/taiwan-md`](https://github.com/frank890417/taiwan-md) | 正規化 Taiwan.md 用語快照 | [Taiwan.md lock](.github/taiwan-terminology-sync/upstream-lock.json) |

五份 lock 記錄各來源目前採用的 commit SHA 與檔案清單（本文件不另存固定 baseline SHA）。

### 各來源採用與映射政策

#### 1. `mattpocock/skills`（主上游）

僅從主上游接收 `skills/**`、`docs/**` 與 `LICENSE`，並排除非 Antigravity 專用的 `agents/` 設定、Claude-only skills、deprecated skills 與上游倉庫腳本：

| 上游路徑／類型 | 處理方式 | 說明 |
| --- | --- | --- |
| `skills/` | 選擇性同步＋映射 | 排除 Claude-only 與 deprecated；依 `categoryMap` 將 `skills/engineering/` 映射為 `skills/software/`，並避開獨立來源保護路徑。 |
| `docs/`、`LICENSE` | 同步 | 保留 `docs/` 與根目錄授權；保護 `docs/security/` 不被覆寫。 |
| `.agents/`、`.changeset/`、`.claude-plugin/`、`.out-of-scope/`、`scripts/`、`package*.json`、`CLAUDE.md`、`CHANGELOG.md` | 排除 | 避免 nested `.agents`、其他工具封裝檔或上游維護工具混入。 |
| `.github/workflows/`、`.gitignore`、`CONTEXT.md`、`README.md` | 自行維護 | 必須符合本儲存庫架構與索引格式。 |

分類 `README.md` 會移除被排除項目的索引列與其他工具的呼叫說明；`docs/**` 除 `docs/security/**` 外維持上游原文。

#### 2. 獨立上游來源

- **Cloudflare `security-audit`**：將 `LICENSE` 與 `skills/security-audit/**` 同步至 `skills/security/security-audit/`；`skills/security/README.md` 與 `docs/security/**` 由本專案維護。
- **`i-have-adhd`**：同步至 `skills/productivity/i-have-adhd/`，adapter 強制注入 `disable-model-invocation: true` 並排除 `agents/` 設定檔。
- **Taiwan.md 詞庫**：`taiwan-term` 流程與掃描器由本專案維護；adapter 僅讀取 `README.md` 與 `data/terminology/*.yaml` 產生離線 JSON 快照，保留 CC BY-SA 4.0 授權資訊，執行時不連線。
- **Emil UI 設計 skills**：`emilkowalski/skills` 的 `skills/*/**` 匯入 `skills/ui-design/*/**`，每支技能保留獨立 `LICENSE` 與參考文件；來源 `prototype` 為避開 `skills/software/prototype` 衝突而更名為 `ui-prototype`（`rules/skills.md` 負責解析別名）。更新時共用索引工具維護 `README.md` 的 UI Design 表格與 `skills/ui-design/README.md`。

### 所有權邊界與架構約束

[`.github/upstream-sync/ownership.json`](.github/upstream-sync/ownership.json) 定義 allowlist、`categoryMap`（`engineering -> software`）、排除規則與受保護的 fork-owned paths（不接受主上游寫入）：

- `rules/**`、`plugins/**`、`docs/security/**`、`MAINTENANCE.md`、`README.md`、`CONTEXT.md`、`.gitignore`
- `skills/hardware/**`、`skills/language/**`、`skills/ui-design/**`、`skills/security/**`、`skills/productivity/i-have-adhd/**`
- `.github/upstream-sync/**`、`.github/skill-sync/**`、`.github/security-audit-sync/**`、`.github/i-have-adhd-sync/**`、`.github/emil-skills-sync/**`、`.github/taiwan-terminology-sync/**`、`.github/workflows/**`

核心架構約束：

- Repository 根目錄不得包含 nested `.agents/`。
- 上游更新只能寫入 allowlist，且 Claude-only／deprecated skills 不得進入 runtime。
- 開發專案各自的 `CONTEXT.md` 與 `docs/adr/` 必須留在各專案內。
- 所有 upstream 同步 PR（含新增、刪除、改名或移動）一律須人工審查，不得 auto-merge。
- `rules/skills.md` 須保持在 12,000 字元內，並由 rules contract test 檢查無舊路徑或名稱。

### 自動更新與檔案契約說明

[`Sync All Skills`](.github/workflows/sync-skills.yml)（集中於 [`.github/skill-sync/sources.json`](.github/skill-sync/sources.json)）於每週一台灣時間 08:00 排程執行：

1. 以 matrix 呼叫共用的 [`sync-source.yml`](.github/workflows/sync-source.yml)，來源間互不影響（`fail-fast: false`），同一來源設有 concurrency 排隊。
2. 比對來源最新 commit 與該來源 lock；無更新時直接跳過後續步驟（也不會取用 `SYNC_PR_TOKEN`）。
3. 有更新時檢查快照、執行 adapter、透過 [索引工具](.github/skill-sync/indexes.mjs) 同步 `README.md`（主上游另外比對確保未夾帶其他修改）並通過全部測試，最後建立或沿用 review-only PR。
4. 四個 JavaScript snapshot adapters 在寫入前會驗證完整 commit SHA 並拒絕 symlink 與不支援的檔案型別；`.gitattributes` 與快照產生器固定 Bash scripts 及詞庫快照使用 LF。

---

## 第二部分：實作與驗證操作（可動手執行）

### 1. 設定 GitHub Token（建立 `SYNC_PR_TOKEN`）

要讓自動同步 workflow 能建立 review-only PR，請在 GitHub 設定以下 Secret：

1. 建立 [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)：
   - **Repository access**：僅選擇此 repository。
   - **Repository permissions**：僅將 `Pull requests` 設為 `Read and write`（本流程透過 REST `POST /repos/{owner}/{repo}/pulls` 建立 PR，不需要 `Contents` 權限）。
2. 到 GitHub Repository 的 `Settings → Secrets and variables → Actions` 新增 repository secret **`SYNC_PR_TOKEN`**，貼上該 token。
3. 若 token 到期或撤銷請重新更新；若設定了強制要求額外 status check 的 ruleset，需補設定 GitHub App／PAT 或人工核准 workflow run。

### 2. 手動觸發上游同步

想立即檢查更新而不等週一排程時：

1. 前往 GitHub Repository 的 **Actions** 分頁，選取 [`Sync All Skills`](.github/workflows/sync-skills.yml)。
2. 點選 **Run workflow**，在 `source` 下拉選單選擇 `all` 或單一來源（`upstream`、`security-audit`、`i-have-adhd`、`taiwan-terminology`、`emil-skills`）。
3. 等待執行完成後，到 **Pull requests** 審查同步 PR 的差異與分類結果，確認無誤後人工合併。

### 3. 驗證

維護環境需具備 **Node.js 22+**、**Git** 與 **Python 3.10+**（Windows 若 `python` 不在 PATH，可設定 `PYTHON` 環境變數為執行檔路徑）。

#### 本機同步與 Repository 契約檢查

```bash
node --test .github/upstream-sync/tests/*.test.mjs
node .github/upstream-sync/validate.mjs
```

> 若修改 snapshot adapter 共用契約，務必執行 `snapshot-input.test.mjs` 與各 adapter 測試；Skill 行為實測與靜態契約檢查分開判定，未執行或略過的案例不代表通過。

#### Antigravity Plugins 檢查（修改 `plugins/**` 後執行）

```bash
# 檢查單一 plugin（須為 0 errors）
agy plugin validate plugins/<plugin-name>

# 除了內含上游 >24,000 bytes SKILL.md 的 ui-design 之外，其餘 6 個 plugin 皆須通過 --strict
agy plugin validate plugins/software --strict
agy plugin validate plugins/hardware --strict
agy plugin validate plugins/productivity --strict
agy plugin validate plugins/language --strict
agy plugin validate plugins/security --strict
agy plugin validate plugins/in-progress --strict
```

> 註：`ui-design` 內的上游 `emil-design-eng/SKILL.md` 與 `write-swift/SKILL.md` 超過 24,000 bytes 單檔讀取提醒門檻；為保留上游原貌不手動截斷，對 `plugins/ui-design` 執行非 strict 驗證（回報 2 項預期 warning、0 error）即可。

#### 台灣用語檢查（新增或修改中文文件後執行）

```bash
python skills/language/taiwan-term/scripts/audit_terms.py --mode detection
```

### 4. 換行政策注意事項

`.gitattributes` 固定 `.sh` 與 `terminology.snapshot.json` 使用 LF。若舊 checkout 尚未套用換行設定，先確認沒有未提交修改，再重新整理這類檔案的換行；切勿為了通過檢查而手動改寫 lock 檔案內的 hash。

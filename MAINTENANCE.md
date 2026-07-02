# 專案維護與 Upstream 同步操作指南 (MAINTENANCE.md)

本專案將 Matt Pocock 的 Agent Skills 轉化為適用於 **Antigravity** 專用的版本。為了保留未來直接拉取原作者更新的便利性，我們採用了 **「外圍動態轉譯（Dynamic Adaptation Layer）」** 的設計架構：**我們 100% 沒有更動 `skills/` 資料夾內的任何檔案**。

當原作者（mattpocock）未來針對 Claude 進行技能更新時，您可以透過本指南中提供的工作流程進行無痛同步。

---

## 🚀 新電腦部署與連結設定

當您將此倉庫複製或 clone 到其他電腦後，請先在該電腦執行以下跨平台腳本，一鍵將技能目錄連結到該電腦的 Antigravity 客製化載入路徑中：

```bash
python scripts/link_skills.py
```
> [!NOTE]
> 在 Windows 系統上，此腳本會自動建立無需系統管理員權限的 Directory Junction (目錄聯接)；在 Linux / macOS 上則建立 Symlink。若連結建立失敗，會自動回退到資料夾複製，確保 100% 部署成功。

---

## 💡 腳本職責與使用情境區分

本專案內置了兩個主要腳本，它們的職責完全獨立，不需重複執行：

| 腳本名稱 | 它的職責 (做什麼) | 什麼時候執行？ |
|---|---|---|
| **[link_skills.py](scripts/link_skills.py)**<br>*(連結器)* | 將專案內的技能資料夾**軟連結（Link）**到您目前電腦的 Antigravity 設定路徑中。 | 1. **新電腦第一次部署**專案時。<br>2. **原作者新增了全新技能資料夾**，需要將新目錄建立連結時。 |
| **[sync_upstream.py](scripts/sync_upstream.py)**<br>*(同步器)* | 向原作者的 GitHub **拉取最新更新（Git Merge）**，並自動修復外圍的 Antigravity 轉譯配置。 | 當您想在**本機立刻取得原作者在 GitHub 上的最新修改**時。 |

### 📋 實戰情境範例：
* **情境 A：在新電腦剛 clone 完專案**
  * ➔ **只需執行**：`python scripts/link_skills.py` 建立軟連結即可，無須執行同步。
* **情境 B：原作者在 GitHub 更新了技能，您想在本機同步更新**
  * ➔ **只需執行**：`python scripts/sync_upstream.py`（先前已連結過，不需重新連結）。
* **情境 C：原作者新增了全新的技能（例如在 `skills/` 下多了一個全新資料夾）**
  * ➔ **需要執行**：先跑 `python scripts/sync_upstream.py` 下載代碼，再跑 `python scripts/link_skills.py` 將新目錄連結到系統中。

---

## 🛠️ 同步管道與操作步驟

本專案提供了三種同步管道，背後的轉譯與修復邏輯完全一致。

### 管道 A：GitHub Actions 自動執行 (推薦，免手動)
我們已在專案中配置了 GitHub Actions 工作流：[.github/workflows/sync-upstream.yml](.github/workflows/sync-upstream.yml)。

1. **每日自動執行**：每天會自動在背景執行一次，檢查原作者的更新，進行合併、套用 Antigravity 轉譯，並自動 push 回您的分支。
2. **網頁手動觸發**：
   * 前往您的 GitHub 專案倉庫網頁。
   * 點選上方導覽列的 **Actions**。
   * 在左側選單選擇 **"Sync Upstream Skills"** 工作流。
   * 點選右側的 **"Run workflow"** 按鈕即可立即手動觸發同步。

---

### 管道 B：本機 Python 腳本執行 (適合本機開發同步)
我們在專案中內置了自動化同步與轉譯修復腳本 [scripts/sync_upstream.py](scripts/sync_upstream.py)。

1. 在本機開啟終端機，切換至專案根目錄。
2. 執行以下指令：
   ```bash
   python scripts/sync_upstream.py
   ```
3. **該腳本會為您自動處理**：
   * 自動新增 `upstream` 遠端倉庫（如果還沒有的話）。
   * 自動執行 `git fetch upstream` 與 `git merge upstream/main`。
   * 自動搜尋並將合併後的 `CONTEXT.md`、`README.md`、`rules/skills.md` 等檔案中的 Claude 特有術語與 Hook 設定，重寫/修補為 Antigravity 專屬的平台轉譯配置與全域技能連結路徑。

---

### 管道 C：手動 Git 同步工作流 (適合排查衝突時使用)
如果您想完全手動控制 Git 合併流程，或者在上述自動化合併遇到無法解決的衝突時，請依照下列步驟進行：

1. **設定遠端倉庫（僅需執行一次）**：
   ```bash
   git remote add upstream https://github.com/mattpocock/skills.git
   ```
2. **獲取與合併更新**：
   ```bash
   git fetch upstream
   git merge upstream/main
   ```
3. **衝突處理原則**：
   大部分未被我們修改過的說明文檔與腳本都會自動無痛合入。只有我們曾客製化修改的外圍檔案，若發生 Merge Conflict 時，請手動保留我們的 Antigravity 專屬配置：
   * **`skills/` 資料夾內**：100% 直接合入，無衝突。
   * **`rules/skills.md`**：保留檔案結尾新增的 `## Agent Harness & Platform Adaptation Layer` 區塊。
   * **`scripts/link-skills.sh`**：保留軟連結目標 `DESTS` 中含有的 `"$HOME/.gemini/config/skills"`。
   * **`CONTEXT.md` / `README.md`**：保留對齊為 `Antigravity` 的術語。
   * **`docs/engineering/setup-matt-pocock-skills.md`**：保留將 `CLAUDE.md / AGENTS.md` 引用改為 `.agents/AGENTS.md` 的文字。
4. 解決衝突後，執行 `git add .` 與 `git commit`。

---

## 🛡️ 防呆備份方案：Patch 檔案

如果您未來想要對專案進行完全覆蓋式的強制更新（例如 `git reset --hard upstream/main`），您可以先將我們的 Antigravity 客製化修改導出為一個 Patch 補丁檔，更新後再重新套用：

* **匯出 Patch 檔案**：
  ```bash
  git diff upstream/main > antigravity_adaptation.patch
  ```
* **套用 Patch 檔案**：
  在您強制同步更新至原作者最新狀態後，執行以下指令重新套用我們的客製化補丁：
  ```bash
  git apply antigravity_adaptation.patch
  ```

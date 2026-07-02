# Antigravity Agent Skills 中文使用指南

這份指南說明如何使用目前整合在 `.agents/skills/` 內的 30 項 active agent skills。這套系統讓 coding agent 在開始工作前能先讀取對應 workflow、專案領域語言與架構決策，而不是只依靠一般性的 coding 行為。

---

## `.agents/` 目錄導覽

`.agents/` 目錄存放 coding agent 的規則、技能索引、領域語言與輔助腳本。它不是 runtime 程式碼目錄；主要用途 is 讓 agent 在修改專案前先取得正確工作流程與文件脈絡。

開始任何非 trivial 修改前，請優先閱讀：

1. `.agents/CONTEXT.md`：專案領域語言與 Agent framework language 的 canonical source。
2. `.agents/rules/skills.md`：技能觸發規則與 Golden Workflow。
3. `.agents/docs/adr/`：架構決策紀錄。

目前 `.agents/` 內的主要分類：

| 路徑 | 用途 |
|------|------|
| `.agents/CONTEXT.md` | 統一領域語言、專案術語與 Agent framework terms。 |
| `.agents/README.md` | Agent 技能與 `.agents/` 目錄使用指南。 |
| `.agents/rules/skills.md` | 技能索引、觸發規則、Golden Workflow。 |
| `.agents/docs/adr/` | Architecture Decision Records。 |
| `.agents/scripts/` | Agent 輔助腳本，例如技能連結、列出技能、HITL loop template、git guardrails。 |
| `.agents/skills/engineering/` | 工程技能，例如 TDD、diagnosing-bugs、to-issues。 |
| `.agents/skills/productivity/` | 生產力技能，例如 grilling、handoff。 |
| `.agents/skills/misc/` | 雜項技能，例如 setup-pre-commit、git guardrails。 |
| `.agents/skills/personal/` | 個人工作流技能，例如 Obsidian vault、文章編輯。 |
| `.agents/skills/in-progress/` | 尚在整理或試驗中的技能。 |
| `.agents/skills/deprecated/` | 已棄用或保留參考的技能。 |

維護原則：

- 新增或更新技能時，先確認 `.agents/rules/skills.md` 的觸發描述是否同步。
- 新的 ADR 應放在 `.agents/docs/adr/`，不要放在 repo root。
- `.agents/CONTEXT.md` 是領域語言的權威來源；術語改動應同步更新這裡。
- `.agents/scripts/` 只放 agent workflow 輔助腳本，不放專案 runtime 腳本。

---

## 如何觸發技能？

在全新的架構下，您**不需要**輸入任何特殊的斜線指令（如 `/diagnose`）。
您只需要在對話中**自然地提到關鍵字或使用情境**，我就會自動啟動對應的工作流程。

**範例用法：**
- 「這個 API 噴錯了，幫我 **diagnose** 一下。」
- 「我們來用 **tdd** 開發登入功能。」
- 「我們來做 **domain modeling**，把領域術語釐清。」
- 「我要實作一個新模組，麻煩先 **grill me**（拷問我）確定細節。」

---

## 技能總覽

完整觸發描述與路徑以 `.agents/rules/skills.md` 為準。每個技能的實際流程以自己的 `SKILL.md` 為準。

### Engineering

| Skill | 用途 |
|------|------|
| `diagnosing-bugs` | 嚴謹除錯與效能回歸診斷。 |
| `code-review` | 依 Standards 與 Spec 兩軸審查變更。 |
| `codebase-design` | 設計深模組（小介面、深實作）與接縫。 |
| `domain-modeling` | 建立與深化專案的領域模型（術語、統一語言與 ADR）。 |
| `grill-with-docs` | 依據 `.agents/CONTEXT.md` 拷問設計並同步文件與 ADR。 |
| `implement` | 依據 PRD 或 issue 實作功能。 |
| `improve-codebase-architecture` | 掃描架構問題並提出可執行重構方向。 |
| `prototype` | 建立 throwaway prototype，用來驗證狀態、商業邏輯或 UI 方向。 |
| `resolving-merge-conflicts` | 解決進行中的 Git merge/rebase 衝突。 |
| `setup-matt-pocock-skills` | 初始化 agent skills 所需的 issue tracker、triage label 與文件慣例。 |
| `tdd` | 依 red-green-refactor 開發功能或修 bug。 |
| `to-issues` | 將計畫、PRD 或 spec 切成可獨立執行的 issues。 |
| `to-prd` | 將對話脈絡整理成 PRD 並發布到 issue tracker。 |
| `triage` | 使用 triage state machine 管理 issues。 |

### Productivity

| Skill | 用途 |
|------|------|
| `grill-me` | 純對話式設計拷問，不強制同步文件。 |
| `grilling` | 針對計畫或設計，對使用者進行連環拷問。 |
| `handoff` | 將目前對話整理成 handoff 文件。 |
| `teach` | 在 workspace 脈絡中教一項技能或概念。 |
| `writing-great-skills` | 撰寫與編輯良好 Agent 技能的參考指引。 |

### Misc

| Skill | 用途 |
|------|------|
| `git-guardrails-claude-code` | 設定 Antigravity 規則限制，攔截危險 git 指令。 |
| `migrate-to-shoehorn` | 將 TypeScript 測試中的 `as` assertions 遷移到 `@total-typescript/shoehorn`。 |
| `scaffold-exercises` | 建立課程 exercise 目錄、題目、解答與 explainers。 |
| `setup-pre-commit` | 設定 Husky、lint-staged、Prettier、type check 與測試 hook。 |

### Personal

| Skill | 用途 |
|------|------|
| `edit-article` | 編修文章草稿，改善結構與文字清晰度。 |
| `obsidian-vault` | 搜尋、建立與整理 Obsidian vault notes。 |

### In Progress

| Skill | 用途 |
|------|------|
| `decision-mapping` | 將模糊的想法轉化為循序漸進的調查工單地圖（不包含一般任務）。 |
| `wayfinder` | 規劃模糊問題的探索路徑，將點子切分為工單逐步解決（包含任務與行動項）。 |
| `writing-beats` | 以 beats 方式逐段組裝文章。 |
| `writing-fragments` | 透過拷問蒐集文章 raw fragments。 |
| `writing-shape` | 將 markdown raw material 逐步整理成可發布文章。 |

### Deprecated

| Skill | 用途 |
|------|------|
| `design-an-interface` | 產生多個不同 interface design 方向。 |
| `qa` | 對話式 QA session 並建立 GitHub issues。 |
| `request-refactor-plan` | 透過訪談建立 refactor plan 並轉為 issue。 |
| `ubiquitous-language` | 從對話萃取 DDD-style ubiquitous language glossary。 |

---

## 常用技能說明

這是日常開發中最常使用的核心功能，主打提升程式碼品質與架構穩定性。

### 1. Diagnosing Bugs (嚴謹除錯流程)
> **觸發詞**：`diagnosing-bugs`, `diagnose`, `debug`, `遇到 Bug`, `效能退化`
- **情境**：遇到難解的 Bug 或效能變差時。
- **運作方式**：我不會瞎猜盲改，而是嚴格執行：建立重現環境 (Reproduce) → 縮小範圍 (Minimise) → 提出假設 (Hypothesise) → 加上觀測日誌 (Instrument) → 修復並加入回歸測試 (Fix + Test)。

### 2. TDD (測試驅動開發)
> **觸發詞**：`tdd`, `red-green-refactor`, `先寫測試`
- **情境**：開發新功能或修復 Bug 時，希望確保測試覆蓋率。
- **運作方式**：我會先撰寫一個會失敗的測試（紅燈），接著實作最小可行程式碼使其通過（綠燈），最後進行重構。

### 3. Grill-with-docs (架構拷問與文件同步)
> **觸發詞**：`grill-with-docs`, `挑戰我的設計`, `確認領域語言`
- **情境**：實作重大架構前，確保雙方理解一致。
- **運作方式**：我會針對您的設計提出連環追問，並依據對話結果即時更新 `CONTEXT.md`（領域專屬語言）與架構決策紀錄 (ADRs)。

### 4. Improve Codebase Architecture (優化專案架構)
> **觸發詞**：`improve-codebase-architecture`, `重構建議`, `改善架構`
- **情境**：感覺專案變成「義大利麵條程式碼」時。
- **運作方式**：我會掃描您的程式碼，並對照 `CONTEXT.md` 的領域語言，揪出高耦合、難以測試的區塊並給出具體的重構計畫。

---

## 專案規劃與管理 (Planning)

### 5. To-PRD (產出需求規格書)
> **觸發詞**：`to-prd`, `產生規格書`, `寫成 PRD`
- **情境**：討論完一個新功能的點子後。
- **運作方式**：我會將我們剛才所有的對話與共識，濃縮成一份結構嚴謹的產品需求規格書（PRD）。

### 6. To-Issues (切分任務 Ticket)
> **觸發詞**：`to-issues`, `切分任務`, `產生 issue`
- **情境**：有了 PRD 或大型計畫後，準備動手實作前。
- **運作方式**：我會把大型任務垂直切分成獨立、可執行的 Issue 列表，方便後續逐一擊破。

### 7. Triage (議題分流)
> **觸發詞**：`triage`, `處理 issue`, `分流`
- **情境**：面對一堆未處理的 Bug 回報或功能請求時。
- **運作方式**：我會透過狀態機機制，幫您審核這些 Issue，加上標籤，並將其整理為可執行的狀態。

---

## 生產力與特殊工具 (Productivity & Misc)

### 8. Grill-me (單純拷問)
> **觸發詞**：`grill-me`, `拷問我`
- **情境**：與 `grill-with-docs` 類似，但不涉及程式碼文件修改，純粹用來驗證您的點子是否有盲點。

### 9. Git Guardrails (Git 防呆機制)
> **觸發詞**：`防呆`, `git guardrails`, `設定保護`
- **情境**：擔心 AI 或自己手滑執行破壞性的 Git 指令。
- **運作方式**：設定腳本攔截 `push`, `reset --hard`, `branch -D` 等危險操作。

### 10. Setup Pre-commit (自動化程式碼檢查)
> **觸發詞**：`setup pre-commit`, `設定 husky`
- **情境**：新專案想導入 Commit 前的格式化與型別檢查。
- **運作方式**：一鍵幫您配置 Husky、lint-staged、Prettier 與測試掛鉤。

---

## 通用技術棧與領域轉譯層 (Domain & Tech Stack Adaptation Layer)

本系統在 `rules/skills.md` 中內置了**動態技術棧轉譯機制**。當您在不同類型的專案中工作時，Agent 會自動識別當前的技術環境，並將通用技能（如 `tdd`、`diagnose` 等）的執行步驟與工具鏈即時適應至對應的開發實踐中：

### 1. 前端網頁開發 (Frontend Web)
* **測試驅動開發 (TDD)**：著重於 Vitest、Jest、Playwright 或 Cypress 等框架的 UI 元件與整合測試，模擬 API 回傳，驗證使用者可觀測的行為。
* **偵錯與診斷 (Diagnose)**：引導使用瀏覽器開發者工具（Console、Network 面板、React/Vue DevTools）與 Lighthouse 效能與相容性檢測。

### 2. 後端服務開發 (Backend Services)
* **測試驅動開發 (TDD)**：著重於 API 端點與控制器整合測試，使用 Fake 或記憶體資料庫（如 SQLite in-memory）代替過度 Mocking。
* **偵錯與診斷 (Diagnose)**：分析結構化日誌（Structured Logs）、資料庫查詢執行計畫（Query Plan）及記憶體/CPU Profile。

### 3. 軟韌體嵌入式系統 (Firmware & Embedded)
* **測試驅動開發 (TDD)**：著重於 C/C++（Unity, Ceedling, Google Test）或 Rust 的**主機端編譯與測試 (Host-side Testing)**，對 HAL 與暫存器進行 Mock 隔離。
* **偵錯與診斷 (Diagnose)**：引導使用 SWD/JTAG 偵錯器（GDB、OpenOCD）進行單步執行，利用邏輯分析儀或示波器擷取匯流排訊號，並使用 RTT/UART 輸出日誌。

### 4. 一般自動化與 Python 腳本 (Automation & Scripting)
* **測試與診斷**：使用 pytest 或 unittest 進行檔案系統與系統指令模擬，診斷異常堆疊與結束代碼（Exit Code），並整合靜態檢查（如 pylint, black）。

---

> [!TIP]
> **最佳實踐**
> 每次準備開發新功能時，建議的黃金組合是：
> 1. 先用 **`grill-with-docs`** 確認架構與領域語言。
> 2. 用 **`to-issues`** 把任務切小。
> 3. 對每個小任務使用 **`tdd`** 進行嚴謹開發。
> 4. 若途中遇到奇怪的錯誤，隨時呼叫 **`diagnosing-bugs`** 處理。

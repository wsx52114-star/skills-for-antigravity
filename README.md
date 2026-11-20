# Skills for Antigravity

一套供各 Antigravity workspace 共用的工程 skills，承襲 [`mattpocock/skills`](https://github.com/mattpocock/skills) 的工作流程，並整合 [`emilkowalski/skills`](https://github.com/emilkowalski/skills) 的設計與介面技能、Antigravity rules、`security-audit`、Taiwan.md 用語檢查與 explicit-only 的 `i-have-adhd`。

建議將儲存庫集中存放於 `~/.agents`，作為共享 Agent home；各開發專案透過本機連結啟用，並保留自己的領域語言、架構決策與程式碼。這不同於 Antigravity 原生位於 `~/.gemini/` 的全域設定。

## 快速開始

完整啟用分為三步：取得共享 Agent home、連結開發專案、檢查安裝。只完成
`git clone` 還不會讓現有開發專案出現 `/skill-name`。

### 1. 取得共享 Agent home

WSL／Linux／Raspberry Pi：

```bash
git clone https://github.com/wsx52114-star/skills-for-antigravity.git ~/.agents
```

Windows：

```powershell
git clone https://github.com/wsx52114-star/skills-for-antigravity.git "$HOME\.agents"
```

若目標目錄已存在，請先確認或備份，勿直接覆寫。

### 2. 在開發專案啟用 skills

WSL／Linux／Raspberry Pi：

```bash
cd ~/path/to/your-project
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --sync
```

Windows：

```powershell
Set-Location "$HOME\path\to\your-project"
powershell -ExecutionPolicy Bypass -File "$HOME\.agents\scripts\init_setup_local_repo_win.ps1" -Action Sync -Mode Link
```

安裝器會建立 `.agents/skills/<skill-name>` 與 `.agents/rules` 連結，
不會覆寫專案的 `CONTEXT.md`、ADR 或 `AGENTS.md`。

預設啟用所有 Runtime skills；若要排除仍在開發中的 skills，請使用
`--channel stable`，Windows 則使用 `-Channel Stable`；後續檢查也須帶相同參數。

### 3. 檢查並開始使用

WSL／Linux／Raspberry Pi：

```bash
bash ~/.agents/scripts/init_setup_local_repo_wsl.sh --check
```

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File "$HOME\.agents\scripts\init_setup_local_repo_win.ps1" -Action Check -Mode Link
```

顯示安裝狀態一致後，重新載入 Antigravity workspace，即可使用 `/tdd`、
`/code-review` 等 flat slash commands，也可以在自然語言中點名 skill。

完整的 Link／Copy Mode、解除安裝、Git ignore 與安全邊界請參考
[專案 Agent Skills 啟用指南](PROJECT_SETUP.md)。

## Repository 內容

| 路徑 | 用途 |
| --- | --- |
| [`skills/`](skills/) | 可由 Antigravity 呼叫的工程、設計、生產力、語言、工具與安全 skills。 |
| [`rules/`](rules/) | Skill 觸發、工作流程與 Antigravity 轉譯規則。 |
| [`docs/`](docs/) | 各 skills 的使用與開發參考。 |
| [`.github/upstream-sync/`](.github/upstream-sync/) | `mattpocock/skills` 上游快照、所有權 policy、驗證與測試。 |
| [`.github/skill-sync/`](.github/skill-sync/) | 所有來源的統一掃描入口、來源清單與共用同步流程。 |
| [`.github/security-audit-sync/`](.github/security-audit-sync/) | Cloudflare `security-audit` 的同步維護工具。 |
| [`.github/i-have-adhd-sync/`](.github/i-have-adhd-sync/) | `i-have-adhd` 的同步維護工具，保留明確指定才執行的限制。 |
| [`.github/emil-skills-sync/`](.github/emil-skills-sync/) | Emil 設計與介面 skills 的固定快照與獨立同步維護工具。 |
| [`.github/taiwan-terminology-sync/`](.github/taiwan-terminology-sync/) | Taiwan.md 固定詞庫快照的同步維護工具。 |
| [`PROJECT_SETUP.md`](PROJECT_SETUP.md) | 開發專案連結 Agent home 的完整設定指南。 |
| [`CONTEXT.md`](CONTEXT.md) | 本專案的標準術語與關係範例。 |

上游的 Claude-only、deprecated 與發布工具不會進入可用 skills。[`security-audit`](skills/security/security-audit/SKILL.md) 與 [`i-have-adhd`](skills/productivity/i-have-adhd/SKILL.md) 分別透過專屬 adapter 同步自 [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill) 與 [`ayghri/i-have-adhd`](https://github.com/ayghri/i-have-adhd)，所有更新均須經 Pull Request 人工審查。

[`taiwan-term`](skills/language/taiwan-term/SKILL.md) 的流程與掃描器由本專案維護；詞庫快照固定於 Taiwan.md commit，更新只透過需人工審查的 Pull Request 採用。

Design 類別透過專屬 adapter 同步自 `emilkowalski/skills`，保留上游觸發設定、參考文件與 MIT 授權。其 `prototype` 在本專案命名為 `ui-prototype`，可與 Engineering 的 `prototype` 一起使用。

所有來源共用 [`Sync All Skills`](.github/workflows/sync-skills.yml) 排程與同步流程：
每週一台灣時間 08:00 檢查全部五個來源；沒有新 commit
就跳過後續處理。可在 Actions 手動選擇單一來源或全部來源，更新各自建立需
人工審查的 PR。

## 更新 Agent home 與專案

先確認 Agent home 沒有未提交變更，再以 `git pull --ff-only` 更新。
Link Mode 會立即取得既有 skill 的新內容；skill 清單變更或使用 Copy Mode 時須重新同步。
操作指令與判斷方式見 [更新生命週期](PROJECT_SETUP.md#完整安裝與更新生命週期)。

## 使用 skills

直接用自然語言描述需求。Antigravity 會依 skill description 選擇工作流程，並在執行前讀取對應的 `SKILL.md`。

例如：

- 「這個 API 一直失敗，請幫我 diagnose。」
- 「用 TDD 實作登入流程。」
- 「先做 domain modeling，把術語釐清。」
- 「用 grill-with-docs 挑戰這個設計。」
- 「對這個 repository 做 security audit。」
- 「用 animate 幫這個選單加上開合動畫。」
- 「用 ui-prototype 做三種卡片介面，讓我挑選。」

## Skills 關鍵字與用途

下表以 skill name 作為關鍵字。完成專案初始化後，可輸入 `/skill-name`，也可在自然語言中明確提到 `skill-name`；標示
「需明確指定」的 skill 只有在使用者點名時才會執行，「可自動選用」則可由
Antigravity 依需求與 frontmatter description 判斷是否使用。

### Engineering

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`ask-matt`](skills/engineering/ask-matt/SKILL.md) | 需明確指定 | 詢問目前情境適合使用哪個 skill 或工作流程。 |
| [`code-review`](skills/engineering/code-review/SKILL.md) | 可自動選用 | 從指定基準審查變更，分別檢查 Standards 與 Spec。 |
| [`codebase-design`](skills/engineering/codebase-design/SKILL.md) | 可自動選用 | 使用 deep module 詞彙設計介面、接縫與可測試性。 |
| [`diagnosing-bugs`](skills/engineering/diagnosing-bugs/SKILL.md) | 可自動選用 | 重現並縮小 bug，驗證假設、修復問題及加入回歸測試。 |
| [`domain-modeling`](skills/engineering/domain-modeling/SKILL.md) | 可自動選用 | 建立專案術語、領域關係與必要的架構決策。 |
| [`grill-with-docs`](skills/engineering/grill-with-docs/SKILL.md) | 需明確指定 | 透過追問釐清設計，同步 glossary 與 ADR。 |
| [`implement`](skills/engineering/implement/SKILL.md) | 需明確指定 | 依據 spec 或 issues 實作工作內容。 |
| [`implement-spec`](skills/engineering/implement-spec/SKILL.md) | 需明確指定 | 依 task graph 以多個 worktree 實作完整 spec。 |
| [`improve-codebase-architecture`](skills/engineering/improve-codebase-architecture/SKILL.md) | 需明確指定 | 掃描 codebase 的 deepening 機會，產生報告並逐項釐清。 |
| [`prototype`](skills/engineering/prototype/SKILL.md) | 可自動選用 | 建立驗證用原型，回答狀態、邏輯或 UI 設計問題。 |
| [`research`](skills/engineering/research/SKILL.md) | 可自動選用 | 依高可信度的第一手資料研究問題，並將報告寫入儲存庫。 |
| [`retro`](skills/engineering/retro/SKILL.md) | 需明確指定 | 回顧 coding session 並提出 agent 環境改善候選。 |
| [`setup-matt-pocock-skills`](skills/engineering/setup-matt-pocock-skills/SKILL.md) | 需明確指定 | 首次使用前設定 issue tracker、triage labels 與 domain docs。 |
| [`tdd`](skills/engineering/tdd/SKILL.md) | 可自動選用 | 以 red-green-refactor 和整合測試開發功能或修復 bug。 |
| [`to-spec`](skills/engineering/to-spec/SKILL.md) | 需明確指定 | 將已確認的對話整理成 spec 並發布到專案 issue tracker。 |
| [`to-tickets`](skills/engineering/to-tickets/SKILL.md) | 需明確指定 | 將 plan 或 spec 切成 tracer-bullet issues 並記錄 blocking edges。 |
| [`triage`](skills/engineering/triage/SKILL.md) | 需明確指定 | 依 triage role state machine 分類、驗證 issues 與外部 PR。 |
| [`wayfinder`](skills/engineering/wayfinder/SKILL.md) | 需明確指定 | 將跨多個 agent session 的大型工作規劃成 decision issues。 |
| [`wizard`](skills/engineering/wizard/SKILL.md) | 可自動選用 | 產生互動式 Bash wizard，引導人工完成設定或單次 migration。 |

### Design

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`animate`](skills/design/animate/SKILL.md) | 可自動選用 | 建立網頁動畫，選擇動態目的、工具、屬性、曲線與時間。 |
| [`animate-expo`](skills/design/animate-expo/SKILL.md) | 可自動選用 | 建立 React Native／Expo 動畫、手勢、轉場與觸覺回饋。 |
| [`animation-performance`](skills/design/animation-performance/SKILL.md) | 可自動選用 | Keep web animations inside the frame budget — animate composite-only properties, keep motion off the main thread when the page is busy, and find the cause when an animation drops frames. |
| [`animation-vocabulary`](skills/design/animation-vocabulary/SKILL.md) | 可自動選用 | 將動畫效果描述轉成精確名稱，方便溝通設計需求。 |
| [`apple-design`](skills/design/apple-design/SKILL.md) | 可自動選用 | 將 Apple 的介面與動態設計原則應用到網頁。 |
| [`ask-emil`](skills/design/ask-emil/SKILL.md) | 需明確指定 | Ask which skill or flow fits your situation. |
| [`ask-sonner`](skills/design/ask-sonner/SKILL.md) | 可自動選用 | 設定、客製化與排查 Sonner toast 通知。 |
| [`break-ui`](skills/design/break-ui/SKILL.md) | 可自動選用 | 以極端資料檢查介面，提供一般與極端資料切換及修正建議。 |
| [`choreograph`](skills/design/choreograph/SKILL.md) | 可自動選用 | Coordinate several elements that animate together — decide what moves, in what order, how much they overlap, and what stays still — so a group reads as one intentional motion instead of a pile of separate animations. |
| [`emil-design-eng`](skills/design/emil-design-eng/SKILL.md) | 可自動選用 | 改善 UI 細節、元件設計、動畫決策與使用質感。 |
| [`find-animation-opportunities`](skills/design/find-animation-opportunities/SKILL.md) | 可自動選用 | 找出值得加入動畫的介面位置，提出具體建議。 |
| [`gestures`](skills/design/gestures/SKILL.md) | 可自動選用 | Build drag, swipe, and sheet interactions that track the finger 1:1 and stay interruptible. |
| [`improve-animations`](skills/design/improve-animations/SKILL.md) | 可自動選用 | 稽核整體動態設計，產生依優先順序排列的實作計畫。 |
| [`learn-taste`](skills/design/learn-taste/SKILL.md) | 需明確指定 | Turn a session's design corrections into rules, with their why, in DESIGN.md, a project skill, or a lint check. |
| [`mobile-native`](skills/design/mobile-native/SKILL.md) | 可自動選用 | 改善手機網頁的觸控、視窗高度、安全區域與互動體驗。 |
| [`pick-ui-library`](skills/design/pick-ui-library/SKILL.md) | 需明確指定 | 依前端需求從上游作者整理的清單挑選 UI 函式庫。 |
| [`remove-animations`](skills/design/remove-animations/SKILL.md) | 可自動選用 | Find the animations an interface doesn't need and remove them — motion on keyboard actions, high-frequency surfaces, functional data, and decoration with no purpose — then clean up what they leave behind. |
| [`review-animations`](skills/design/review-animations/SKILL.md) | 需明確指定 | 依設計工程準則審查既有動畫與動態程式碼。 |
| [`ui-prototype`](skills/design/ui-prototype/SKILL.md) | 需明確指定 | 建立多種 UI 原型與切換器，等待使用者選定後再整合。 |
| [`write-swift`](skills/design/write-swift/SKILL.md) | 可自動選用 | 撰寫與審查現代 Swift、並行模型、效能及測試。 |

### Hardware

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`kicad-pcb`](skills/hardware/kicad-pcb/SKILL.md) | 可自動選用 | 設定 KiCad `.kicad_pro`／`.kicad_dru` 規則、元件佈局、45° 走線、鋪銅回流、四層功率板與同尺寸減層試作。 |
| [`kicad-release`](skills/hardware/kicad-release/SKILL.md) | 可自動選用 | 執行 KiCad 10 CLI ERC／DRC 與一致性檢查，於工作副本清理懸空物件，把關零錯誤與製造檔匯出。 |
| [`kicad-schematic`](skills/hardware/kicad-schematic/SKILL.md) | 可自動選用 | 定義開案電氣參數、核對 KiCad 原理圖電源與封裝、建立跨板排線與共用腳位表並完成 ERC 驗收。 |

### Security

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`security-audit`](skills/security/security-audit/SKILL.md) | 可自動選用 | 稽核 codebase，尋找並驗證具有實際影響的可利用安全問題。 |

### Language

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`taiwan-term`](skills/language/taiwan-term/SKILL.md) | 可自動選用 | 依固定 Taiwan.md 詞庫快照檢查並修正台灣用語，保留領域術語與受保護文字。 |

### Misc

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`migrate-to-shoehorn`](skills/misc/migrate-to-shoehorn/SKILL.md) | 可自動選用 | 將 TypeScript 測試的 `as` assertions 遷移到 `@total-typescript/shoehorn`。 |
| [`scaffold-exercises`](skills/misc/scaffold-exercises/SKILL.md) | 可自動選用 | 建立包含 sections、problems、solutions 與 explainers 的練習結構。 |
| [`setup-pre-commit`](skills/misc/setup-pre-commit/SKILL.md) | 可自動選用 | 設定 Husky、lint-staged、Prettier、type check 與 commit-time tests。 |

### Productivity

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`grill-me`](skills/productivity/grill-me/SKILL.md) | 需明確指定 | 以持續追問方式釐清並強化 plan 或 design。 |
| [`grilling`](skills/productivity/grilling/SKILL.md) | 可自動選用 | 壓力測試使用者的計畫、決策或想法。 |
| [`handoff`](skills/productivity/handoff/SKILL.md) | 需明確指定 | 將目前對話壓縮成可交給另一個 agent 接手的文件。 |
| [`i-have-adhd`](skills/productivity/i-have-adhd/SKILL.md) | 需明確指定 | 將回覆整理成 action-first、可直接執行的 ADHD-friendly 格式。 |
| [`teach`](skills/productivity/teach/SKILL.md) | 需明確指定 | 在目前 workspace 脈絡中教授技能或概念。 |
| [`to-questionnaire`](skills/productivity/to-questionnaire/SKILL.md) | 需明確指定 | 將無法自行回答的決策整理成供他人填寫的問卷。 |
| [`wait-what`](skills/productivity/wait-what/SKILL.md) | 需明確指定 | 以更簡單並補足脈絡的方式重新說明上一段內容。 |
| [`writing-for-agents`](skills/productivity/writing-for-agents/SKILL.md) | 可自動選用 | 撰寫與編修供 agents 使用的 skills、規則及指引文件。 |

### In Progress

以下 skills 仍在開發中，行為可能隨上游更新而改變。

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`chief-of-staff`](skills/in-progress/chief-of-staff/SKILL.md) | 需明確指定 | 協調子 agents 與排程，在單一 session 中推進長期目標。 |
| [`loop-me`](skills/in-progress/loop-me/SKILL.md) | 需明確指定 | 針對想建立的 workflows 進行規格訪談。 |
| [`setup-ts-deep-modules`](skills/in-progress/setup-ts-deep-modules/SKILL.md) | 需明確指定 | 為 TypeScript repository 設定 dependency-cruiser 與 deep module 邊界。 |
| [`software-factory`](skills/in-progress/software-factory/SKILL.md) | 需明確指定 | Shared language for designing a software factory: the tasks it runs and the services it plugs into. |
| [`writing-beats`](skills/in-progress/writing-beats/SKILL.md) | 需明確指定 | 將原始素材組合成有先後脈絡的文章 beats。 |
| [`writing-fragments`](skills/in-progress/writing-fragments/SKILL.md) | 需明確指定 | 探索並蒐集尚未組織的寫作 fragments。 |
| [`writing-shape`](skills/in-progress/writing-shape/SKILL.md) | 需明確指定 | 將原始素材逐段整理成文章。 |

這份索引是目前 Runtime skills 的閱讀入口；各 skill 的 frontmatter 與完整行為仍以
自己的 `SKILL.md` 為準。[`rules/skills.md`](rules/skills.md) 負責 workspace 內的觸發、編排與
Antigravity 轉譯。

## 跨領域開發流程與雙向護欄

本儲存庫涵蓋多個工程與設計領域。各領域共用同一套**「起手鎖定規格與邊界 → 隔離 Context 施工 → 硬門檻驗收斷路 → 沉澱單一真實來源（SSOT）」**的雙向護欄原則，但依領域特性走各自的工作流，不將單一模板硬套於所有任務。

### 各領域標準工作流

| 領域 | 路由與適用情境 | 起手式（鎖定規格與邊界） | 執行期（隔離施工） | 收尾驗收（硬門檻與斷路器） | 沉澱之專案 SSOT |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **軟體／後端／韌體工程**<br>(`Engineering`) | `/ask-matt`<br>功能開發、重構、除錯 | `grill-with-docs` → `to-spec` → `to-tickets`（大型跨 Session 規劃先走 `wayfinder`；需驗證邏輯時搭配 `prototype`） | `implement` + `tdd`（每張 Ticket 使用全新 Context Window）或 `implement-spec`（多 Worktree 平行 Subagents） | `code-review`（平行啟動 Standards 與 Spec 兩個全新 Subagents 獨立審查） | `.agents/CONTEXT.md`、`.agents/docs/adr/`、`CODING_STANDARDS.md` 與 Linter（透過 `retro` 轉化） |
| **前端介面與動態設計**<br>(`Design`) | `/ask-emil`<br>UI 元件、動畫、手勢、行動端體驗 | `ui-prototype`（於隔離頁面建立 3～5 種不同設計軸向的實動原型供真人挑選，探索期嚴禁修改正式碼） | `pick-ui-library` → `animate`／`choreograph`／`gestures`／`animate-expo` | `break-ui`（極端資料壓力測試）、`review-animations`、`mobile-native`、`animation-performance` | 根目錄 `DESIGN.md` 與 Lint 規則（透過 `learn-taste` 收錄設計修正與背後的 `Why`） |
| **硬體電路與 PCB**<br>(`Hardware`) | KiCad 10 開案、改版、多板互連、減層試作 | `kicad-schematic`（開案先填妥「機構、電氣、板廠、網路分類、版別與驗收」五項參數表與跨板排線表） | `kicad-pcb`（先鎖機構再走功率迴路；減層試作須另建副本；`0 Ω` 跨線須回標原理圖與 BOM） | `kicad-release`（執行 KiCad 10 CLI 強制確認 **ERC = 0、DRC = 0、未接線 = 0、Schematic Parity = 0**，於工作副本清理懸空物件並匯出製造檔） | `.kicad_pro`、`.kicad_dru`、原理圖跨板接線表、BOM 與 `.agents/docs/adr/`（記錄分地或減層取捨） |
| **資安與用語稽核**<br>(`Security`／`Language`) | `security-audit`<br>`taiwan-term` | 先盤點專案範圍、排除路徑（Exclusions），並讀取 `.agents/CONTEXT.md` 保護領域專有名詞 | 執行離線確定性掃描（如 `audit_terms.py`）或建立攻擊面覆蓋率帳本，禁止憑直覺全域替換 | `validate-coverage-ledger.cjs`、`validate-findings.cjs`（強制驗證 PoC 與真實影響）及 Diff 迴歸檢查 | 稽核報告、覆蓋率帳本與 `.agents/CONTEXT.md` 詞庫規範 |
| **跨領域輔助與交接**<br>(`Productivity`) | 可疊加於上述任何領域流程 | `/i-have-adhd`（開啟行動優先、每輪重申進度 `Step X of Y`）、`/to-questionnaire`（向外部人員蒐集決策） | `/wait-what`（即時以領域詞彙重述脈絡） | `/i-have-adhd` 內建 **3 輪除錯螺旋斷路器**；跨環境或分叉支線時執行 `/handoff` | `%TEMP%`／`$TMPDIR` 交接檔（僅存指標路徑，不重複複製 Spec 與 ADR） |

### 上下文衛生與斷路器規則（Context Hygiene & Circuit Breakers）

為了防止多輪對話後的試錯過程污染 Context Window（導致第 3～5 輪開始修 A 壞 B），操作時應遵循以下斷路器機制：

1. **規劃與施工物理隔離**：
   - **規劃期（`grill-with-docs → to-spec → to-tickets`）**：保持在同一個未受污染的對話視窗（Smart Zone 約 150k tokens 內）完成，確保規格與切片共享完整決策脈絡。
   - **施工期（`implement`／`implement-spec`）**：`to-tickets` 產出的每張 Ticket 皆為**可獨立驗證、且大小剛好塞進單一全新 Context Window 的垂直切片（Tracer Bullet）**。每完成一張 Ticket 即執行 `/clear` 重開對話視窗，下一個 Session 僅讀取下一張 Ticket、Spec 與專案 SSOT，徹底切斷前一張 Ticket 的試錯噪音。
2. **階段邊界五選一決策樹（Phase Boundaries）**：
   當一個階段結束時，依序評估以下五種交接方式（第一個符合者勝出）：
   - **Continue（原地繼續）**：下一階段需要當前對話作為第一手脈絡（如小範圍 `grill-with-docs` 後直接 `implement`），且剩餘 Context 空間充足。
   - **`/clear`（清空重開）**：當前對話的探索與試錯對下一步已無保留價值（如一張 Ticket 已完工提交，準備接下一張 Ticket）。
   - **`/handoff`（產出交接檔）**：僅在工作需要**跨工具（Harness）、跨目錄（如切換至獨立 Prototype 目錄）、交接給同事、或從當前對話分叉（Fork）出支線任務**時使用。
   - **Subagent（委派子代理）**：任務邊界明確且無須人工中途介入（如 `code-review` 雙軸平行審查、`research` 查閱外部第一手文件）。
   - **`/compact`（壓縮摘要）**：同工具、同目錄且需保留當前意圖進入下一階段時使用。
3. **試錯與邏輯發散斷路器**：
   - **禁止盲猜修 Bug**：施工中遇到非預期故障或回歸錯誤，必須先透過 `diagnosing-bugs` 建立「單一指令即可穩定重現錯誤」的緊密回饋迴圈（Tight Feedback Loop），禁止在重現前連續猜測改碼。
   - **3 輪除錯螺旋停損（Debug Spiral Rule）**：同一問題連續修改 3 輪仍未解決時，必須立即停止改碼，點出可能錯誤的前置假設並重新診斷；必要時直接回滾未提交變更並重開新對話。
   - **收尾決策理由檢驗（金絲雀測試）**：每張 Ticket 或每版修改收尾準備提交前，要求 AI 於回覆或 Commit／PR 摘要中簡述 **「(1) 改了什麼、(2) 為什麼這樣改、(3) 放棄了哪個替代方案」**。一旦發現 AI 無法給出合理原因、開始硬拗或違反 Spec／ADR，代表該 Session 注意力已發散中毒——應立即捨棄未提交亂改、重開乾淨對話視窗並僅餵入 Spec、Ticket 與 ADR 重新接力。

## 專案文件與單一真實來源（SSOT）

為了避免把所有歷史紀錄塞進單一 `.md` 導致「文件通膨」與二次 Context 污染，每個開發專案的持久知識採取**四層職責分離**；共享的 skills 與 rules 僅以機器本機連結接入：

| SSOT 層級 | 專案路徑 | 職責與寫入時機 | 嚴禁事項（防污染邊界） |
| :--- | :--- | :--- | :--- |
| **1. 領域詞彙層** | `.agents/CONTEXT.md`<br>（或多語境 `.agents/CONTEXT-MAP.md`） | 由 `domain-modeling`／`grill-with-docs` 在術語釐清當下即時更新，定義專案標準名詞、實體關係與禁用同義詞（`_Avoid_`）。 | **僅作為詞彙表（Glossary）**；嚴禁寫入實作細節、API 規格、操作指令或開發日誌。 |
| **2. 架構決策層** | `.agents/docs/adr/NNNN-slug.md` | 僅在決策同時滿足 **① 難以逆轉（Hard to reverse）、② 無脈絡會令人驚訝（Surprising without context）、③ 真實技術取捨（Real trade-off）** 三項門檻時建立，記錄決策背景、理由與淘汰方案（`Considered Options`）。 | **嚴禁當作每版修改的 Changelog 流水帳**；日常局部實作理由應寫在 Commit／PR 或 Spec，保持 ADR 高純度以供後續 Session 按需讀取。 |
| **3. 需求與狀態機層** | Issue Tracker 或<br>`.scratch/<feature>/issues/<NN>-<slug>.md` | 由 `to-spec` 記錄單次功能的 `Implementation Decisions`、`Testing Decisions`（測試接縫 Seams）與 `Out of Scope`；由 `to-tickets`／`wayfinder` 建立帶 `Blocked by` 相依邊的工作狀態機。 | Ticket 為單次 Context Window 的拋棄式工作單元，**完工驗收後即關閉**，不作為永久架構文件維護。 |
| **4. 領域規範與自動防呆層** | 根目錄 `AGENTS.md`、`CODING_STANDARDS.md`、`DESIGN.md`、`.kicad_pro`、`.kicad_dru`、Pre-commit／Linter | • `AGENTS.md`：專案特定的建置、測試與修改限制。<br>• `CODING_STANDARDS.md` 與 Linter：由 `retro` 將踩坑經驗優先轉為 **0 Token 成本的自動化檢查（Linter／Pre-commit／CI）**，無法自動化的判斷準則才寫入 `CODING_STANDARDS.md` 供 `code-review` 讀取。<br>• `DESIGN.md`：由 `learn-taste` 記錄 UI 品味規則與 `Why`。<br>• `.kicad_pro`、`.kicad_dru` 與接線表：記錄硬體製程下限、Netclasses、自訂 DRC 規則與跨板腳位定義。 | 機械性語法或格式規範應優先交由 Linter／ERC／DRC 強制把關，避免堆積過長文字規範消耗實作 Agent 的 Context。 |

完整目錄結構、連結安裝與 Git 管理方式見 [PROJECT_SETUP.md](PROJECT_SETUP.md)。

## 維護

上游採用政策、自動同步與驗證方式見 [MAINTENANCE.md](MAINTENANCE.md)。上游授權保留於 [LICENSE](LICENSE)。

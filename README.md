# Skills for Antigravity

這是一套給 Antigravity 使用的共用技能（Skills）與規則集，整合了軟體開發、硬體 KiCad 電路設計、介面動畫、資安檢查、台灣用語校對與團隊協作工具。

設定一次後，就能在所有專案共用這些技能，並依照目前的專案類型自由開關，避免不需要的工具干擾對話。

## 快速開始

### 1. 下載到 `~/.agents`

Windows（PowerShell）：

```powershell
git clone https://github.com/wsx52114-star/skills-for-antigravity.git "$HOME\.agents"
```

WSL／Linux／Raspberry Pi：

```bash
git clone https://github.com/wsx52114-star/skills-for-antigravity.git ~/.agents
```

> 若 `~/.agents` 資料夾已存在，請先確認內容或備份，勿直接覆蓋。

### 2. 掛載到 Antigravity

編輯 `~/.gemini/config/plugins.json`（Windows 為 `%USERPROFILE%\.gemini\config\plugins.json`），填入 `plugins` 資料夾的**完整絕對路徑**（不可寫成 `~/`）：

```json
{
  "entries": [
    {
      "path": "C:/Users/<your-user>/.agents/plugins"
    }
  ]
}
```

（Linux／WSL／Raspberry Pi 請改填 `/home/<your-user>/.agents/plugins`。）

### 3. 依專案需求開關功能套件

掛載後，打開 Antigravity 左側邊欄 **Customizations > Installed**（或使用 `agy plugin list` / `agy plugin enable <名稱>` / `agy plugin disable <名稱>`）即可隨時開關以下 7 個套件。關閉的套件不會載入，也不會浪費額外容量：

| 套件名稱 | 在 App 顯示的名稱 | 預設狀態 | 包含什麼功能 |
| --- | --- | --- | --- |
| [`software`](plugins/software/plugin.json) | 軟體開發（Software） | 開啟 | 規格討論、TDD 開發、除錯與程式碼審查（19） |
| [`hardware`](plugins/hardware/plugin.json) | 硬體開發（Hardware） | 開啟 | KiCad 原理圖、PCB 佈線與製造檔檢查（3） |
| [`productivity`](plugins/productivity/plugin.json) | 通用協作與生產力（Productivity） | 開啟 | 計畫壓力測試、設計冷讀、文件漂移稽核、對話交接、教學與提問輔助（10） |
| [`language`](plugins/language/plugin.json) | 台灣用語規範（Language） | 開啟 | 繁體中文與台灣技術用語離線檢查（1） |
| [`ui-design`](plugins/ui-design/plugin.json) | Web 與介面設計（UI Design） | 關閉 | 網頁動態、手勢、Apple 介面規範與 Swift（20） |
| [`security`](plugins/security/plugin.json) | 資安稽核（Security） | 關閉 | 程式碼與 API 漏洞檢查流程（1） |
| [`in-progress`](plugins/in-progress/plugin.json) | 上游開發中與雜項（In Progress & Misc） | 關閉 | 上游測試中工具、寫作流程與 TypeScript 輔助（10） |

### 4. 日常使用與更新

- **使用方式**：直接用自然語言告訴 Antigravity 你想做的事（例如「幫我用 TDD 寫登入功能」、「對這個專案做資安檢查」），或輸入 `/技能名稱` 直接呼叫。
- **保持更新**：先確認 `~/.agents` 沒有未儲存的修改，再執行 `git pull --ff-only` 即可取得最新技能。

## 資料夾說明

| 資料夾 | 說明 |
| --- | --- |
| [`plugins/`](plugins/README.md) | 7 個可直接開關的領域套件設定（各自引用下方的 `skills/` 與專用規則）。 |
| [`skills/`](skills/) | 64 個技能的實際定義檔，依領域分類存放。 |
| [`rules/`](rules/) | 跨套件共用的基礎行為規範。 |
| [`docs/`](docs/) | 各技能的補充參考文件。 |

> 想了解上游自動更新來源、GitHub 設定與維護測試指令，請參閱 [維護手冊（MAINTENANCE.md）](MAINTENANCE.md)。

## 全部技能一覽

下列為所有可用技能。標示「可自動選用」時，Antigravity 會依你的需求自動取用；標示「需明確指定」時，需要你在對話中點名（或輸入 `/技能名稱`）才會執行。

### 軟體開發（Software）

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`ask-matt`](skills/software/ask-matt/SKILL.md) | 需明確指定 | 詢問目前情境適合使用哪個 skill 或工作流程。 |
| [`code-review`](skills/software/code-review/SKILL.md) | 可自動選用 | 從指定基準審查變更，分別檢查 Standards 與 Spec。 |
| [`codebase-design`](skills/software/codebase-design/SKILL.md) | 可自動選用 | 使用 deep module 詞彙設計介面、接縫與可測試性。 |
| [`diagnosing-bugs`](skills/software/diagnosing-bugs/SKILL.md) | 可自動選用 | 重現並縮小 bug，驗證假設、修復問題及加入回歸測試。 |
| [`domain-modeling`](skills/software/domain-modeling/SKILL.md) | 可自動選用 | 建立專案術語、領域關係與必要的架構決策。 |
| [`grill-with-docs`](skills/software/grill-with-docs/SKILL.md) | 需明確指定 | 透過追問釐清設計，同步 glossary 與 ADR。 |
| [`implement`](skills/software/implement/SKILL.md) | 需明確指定 | 依據 spec 或 issues 實作工作內容。 |
| [`implement-spec`](skills/software/implement-spec/SKILL.md) | 需明確指定 | 依 task graph 以多個 worktree 實作完整 spec。 |
| [`improve-codebase-architecture`](skills/software/improve-codebase-architecture/SKILL.md) | 需明確指定 | 掃描 codebase 的 deepening 機會，產生報告並逐項釐清。 |
| [`prototype`](skills/software/prototype/SKILL.md) | 可自動選用 | 建立驗證用原型，回答狀態、邏輯或 UI 設計問題。 |
| [`research`](skills/software/research/SKILL.md) | 可自動選用 | 依高可信度的第一手資料研究問題，並將報告寫入儲存庫。 |
| [`retro`](skills/software/retro/SKILL.md) | 需明確指定 | 回顧 coding session 並提出 agent 環境改善候選。 |
| [`setup-matt-pocock-skills`](skills/software/setup-matt-pocock-skills/SKILL.md) | 需明確指定 | 首次使用前設定 issue tracker、triage labels 與 domain docs。 |
| [`tdd`](skills/software/tdd/SKILL.md) | 可自動選用 | 以 red-green-refactor 和整合測試開發功能或修復 bug。 |
| [`to-spec`](skills/software/to-spec/SKILL.md) | 需明確指定 | 將已確認的對話整理成 spec 並發布到專案 issue tracker。 |
| [`to-tickets`](skills/software/to-tickets/SKILL.md) | 需明確指定 | 將 plan 或 spec 切成 tracer-bullet issues 並記錄 blocking edges。 |
| [`triage`](skills/software/triage/SKILL.md) | 需明確指定 | 依 triage role state machine 分類、驗證 issues 與外部 PR。 |
| [`wayfinder`](skills/software/wayfinder/SKILL.md) | 需明確指定 | 將跨多個 agent session 的大型工作規劃成 decision issues。 |
| [`wizard`](skills/software/wizard/SKILL.md) | 可自動選用 | 產生互動式 Bash wizard，引導人工完成設定或單次 migration。 |

### Web 與介面設計（UI Design）

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`animate`](skills/ui-design/animate/SKILL.md) | 可自動選用 | 建立網頁動畫，選擇動態目的、工具、屬性、曲線與時間。 |
| [`animate-expo`](skills/ui-design/animate-expo/SKILL.md) | 可自動選用 | 建立 React Native／Expo 動畫、手勢、轉場與觸覺回饋。 |
| [`animation-performance`](skills/ui-design/animation-performance/SKILL.md) | 可自動選用 | 控制網頁動畫效能預算，僅動畫化合成層屬性並找出掉幀原因。 |
| [`animation-vocabulary`](skills/ui-design/animation-vocabulary/SKILL.md) | 可自動選用 | 將動畫效果描述轉成精確名稱，方便溝通設計需求。 |
| [`apple-design`](skills/ui-design/apple-design/SKILL.md) | 可自動選用 | 將 Apple 的介面與動態設計原則應用到網頁。 |
| [`ask-emil`](skills/ui-design/ask-emil/SKILL.md) | 需明確指定 | 詢問目前介面或動畫情境適合使用哪個 UI Design 技能。 |
| [`ask-sonner`](skills/ui-design/ask-sonner/SKILL.md) | 可自動選用 | 設定、客製化與排查 Sonner toast 通知。 |
| [`break-ui`](skills/ui-design/break-ui/SKILL.md) | 可自動選用 | 以極端資料檢查介面，提供一般與極端資料切換及修正建議。 |
| [`choreograph`](skills/ui-design/choreograph/SKILL.md) | 可自動選用 | 協調多個元件的連動進場順序與節奏，讓畫面動態更有整體感。 |
| [`emil-design-eng`](skills/ui-design/emil-design-eng/SKILL.md) | 可自動選用 | 改善 UI 細節、元件設計、動畫決策與使用質感。 |
| [`find-animation-opportunities`](skills/ui-design/find-animation-opportunities/SKILL.md) | 可自動選用 | 找出值得加入動畫的介面位置，提出具體建議。 |
| [`gestures`](skills/ui-design/gestures/SKILL.md) | 可自動選用 | 實作跟手且可隨時中斷的拖曳、滑動與抽屜手勢互動。 |
| [`improve-animations`](skills/ui-design/improve-animations/SKILL.md) | 可自動選用 | 稽核整體動態設計，產生依優先順序排列的實作計畫。 |
| [`learn-taste`](skills/ui-design/learn-taste/SKILL.md) | 需明確指定 | 將對話中的介面設計修正整理成 DESIGN.md 或 lint 規則與原因。 |
| [`mobile-native`](skills/ui-design/mobile-native/SKILL.md) | 可自動選用 | 改善手機網頁的觸控、視窗高度、安全區域與互動體驗。 |
| [`pick-ui-library`](skills/ui-design/pick-ui-library/SKILL.md) | 需明確指定 | 依前端需求從上游作者整理的清單挑選 UI 函式庫。 |
| [`remove-animations`](skills/ui-design/remove-animations/SKILL.md) | 可自動選用 | 移除多餘或干擾高頻操作的動畫並清理殘留程式碼。 |
| [`review-animations`](skills/ui-design/review-animations/SKILL.md) | 需明確指定 | 依設計工程準則審查既有動畫與動態程式碼。 |
| [`ui-prototype`](skills/ui-design/ui-prototype/SKILL.md) | 需明確指定 | 建立多種 UI 原型與切換器，等待使用者選定後再整合。 |
| [`write-swift`](skills/ui-design/write-swift/SKILL.md) | 可自動選用 | 撰寫與審查現代 Swift、並行模型、效能及測試。 |

### 硬體開發（Hardware）

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`kicad-pcb`](skills/hardware/kicad-pcb/SKILL.md) | 可自動選用 | 設定 KiCad `.kicad_pro`／`.kicad_dru` 規則、元件佈局、90°／45° 走線、焊盤／過孔中心對齊、鋪銅回流、絲印擺放與四層／減層規則。 |
| [`kicad-release`](skills/hardware/kicad-release/SKILL.md) | 可自動選用 | 執行 KiCad 10 CLI ERC／DRC 與一致性檢查，於工作副本清理懸空物件，把關零錯誤與製造檔匯出。 |
| [`kicad-schematic`](skills/hardware/kicad-schematic/SKILL.md) | 可自動選用 | 定義開案電氣參數、核對 KiCad 原理圖電源與封裝、建立跨板排線與共用腳位表並完成 ERC 驗收。 |

### 資安稽核（Security）

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`security-audit`](skills/security/security-audit/SKILL.md) | 可自動選用 | 稽核 codebase，尋找並驗證具有實際影響的可利用安全問題。 |

### 台灣用語規範（Language）

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`taiwan-term`](skills/language/taiwan-term/SKILL.md) | 可自動選用 | 依固定 Taiwan.md 詞庫快照檢查並修正台灣用語，保留領域術語與受保護文字。 |

### 雜項工具（Misc）

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`migrate-to-shoehorn`](skills/misc/migrate-to-shoehorn/SKILL.md) | 可自動選用 | 將 TypeScript 測試的 `as` assertions 遷移到 `@total-typescript/shoehorn`。 |
| [`scaffold-exercises`](skills/misc/scaffold-exercises/SKILL.md) | 可自動選用 | 建立包含 sections、problems、solutions 與 explainers 的練習結構。 |
| [`setup-pre-commit`](skills/misc/setup-pre-commit/SKILL.md) | 可自動選用 | 設定 Husky、lint-staged、Prettier、type check 與 commit-time tests。 |

### 通用協作與生產力（Productivity）

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`design-review`](skills/productivity/design-review/SKILL.md) | 需明確指定 | 以零脈絡雙軸子代理冷讀審查規格或設計文件，於拆票或實作前把關。 |
| [`doc-drift`](skills/productivity/doc-drift/SKILL.md) | 需明確指定 | 稽核長期專案文件（CONTEXT、ADR、規格、硬體設計筆記）與現行實作的漂移。 |
| [`grill-me`](skills/productivity/grill-me/SKILL.md) | 需明確指定 | 以持續追問方式釐清並強化 plan 或 design。 |
| [`grilling`](skills/productivity/grilling/SKILL.md) | 可自動選用 | 壓力測試使用者的計畫、決策或想法。 |
| [`handoff`](skills/productivity/handoff/SKILL.md) | 需明確指定 | 將目前對話壓縮成可交給另一個 agent 接手的文件。 |
| [`i-have-adhd`](skills/productivity/i-have-adhd/SKILL.md) | 需明確指定 | 將回覆整理成 action-first、可直接執行的 ADHD-friendly 格式。 |
| [`teach`](skills/productivity/teach/SKILL.md) | 需明確指定 | 在目前 workspace 脈絡中教授技能或概念。 |
| [`to-questionnaire`](skills/productivity/to-questionnaire/SKILL.md) | 需明確指定 | 將無法自行回答的決策整理成供他人填寫的問卷。 |
| [`wait-what`](skills/productivity/wait-what/SKILL.md) | 需明確指定 | 以更簡單並補足脈絡的方式重新說明上一段內容。 |
| [`writing-for-agents`](skills/productivity/writing-for-agents/SKILL.md) | 可自動選用 | 撰寫與編修供 agents 使用的 skills、規則及指引文件。 |

### 上游開發中（In Progress）

以下 skills 仍在開發中，行為可能隨上游更新而改變。

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`chief-of-staff`](skills/in-progress/chief-of-staff/SKILL.md) | 需明確指定 | 協調子 agents 與排程，在單一 session 中推進長期目標。 |
| [`loop-me`](skills/in-progress/loop-me/SKILL.md) | 需明確指定 | 針對想建立的 workflows 進行規格訪談。 |
| [`setup-ts-deep-modules`](skills/in-progress/setup-ts-deep-modules/SKILL.md) | 需明確指定 | 為 TypeScript repository 設定 dependency-cruiser 與 deep module 邊界。 |
| [`software-factory`](skills/in-progress/software-factory/SKILL.md) | 需明確指定 | 規劃自動化軟體工廠流程與串接任務的共用規格語言。 |
| [`writing-beats`](skills/in-progress/writing-beats/SKILL.md) | 需明確指定 | 將原始素材組合成有先後脈絡的文章 beats。 |
| [`writing-fragments`](skills/in-progress/writing-fragments/SKILL.md) | 需明確指定 | 探索並蒐集尚未組織的寫作 fragments。 |
| [`writing-shape`](skills/in-progress/writing-shape/SKILL.md) | 需明確指定 | 將原始素材逐段整理成文章。 |

## 維護與授權

上游同步策略、GitHub Actions 設定與驗證指令見 [MAINTENANCE.md](MAINTENANCE.md)；各套件開發細節見 [plugins/README.md](plugins/README.md)。本專案授權見根目錄 [LICENSE](LICENSE)，各上游來源授權保留於 [LICENSES/mattpocock-skills.LICENSE](LICENSES/mattpocock-skills.LICENSE) 及個別技能目錄內的 `LICENSE`／`NOTICE.md`。

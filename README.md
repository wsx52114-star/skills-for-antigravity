# Skills for Antigravity

一套集中管理、供各 Antigravity workspace 共用的工程 skills。它承襲 [`mattpocock/skills`](https://github.com/mattpocock/skills) 的工作流程，並整合 Antigravity rules、完整產品開發生命週期、Cloudflare `security-audit`、explicit-only 的 `i-have-adhd`，以及精選的 [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) 專業能力。

Repository 建議集中存放於 `~/.agents`，作為共享 Agent home；各開發專案再透過 project-local 連結啟用，並保有自己的領域語言、架構決策與程式碼。這不同於 Antigravity 原生位於 `~/.gemini/` 的 global configuration。

## 內容

| 路徑 | 用途 |
| --- | --- |
| [`skills/`](skills/) | 可由 Antigravity 呼叫的工程、生產力、工具與安全 skills。 |
| [`rules/`](rules/) | Skill 觸發、工作流程與 Antigravity 轉譯規則。 |
| [`docs/`](docs/) | 各 skills 的使用與開發參考。 |
| [`.github/upstream-sync/`](.github/upstream-sync/) | `mattpocock/skills` 上游快照、所有權 policy、驗證與測試。 |
| [`.github/security-audit-sync/`](.github/security-audit-sync/) | Cloudflare `security-audit` 的獨立同步 control plane。 |
| [`.github/i-have-adhd-sync/`](.github/i-have-adhd-sync/) | `i-have-adhd` 的 explicit-only 同步 control plane。 |
| [`.github/agent-skills-sync/`](.github/agent-skills-sync/) | Addy allowlist、版本鎖定與獨立同步 control plane。 |
| [`PROJECT_SETUP.md`](PROJECT_SETUP.md) | 開發專案連結 Agent home 的完整設定指南。 |
| [`CONTEXT.md`](CONTEXT.md) | 本專案的標準術語與關係範例。 |

上游的 Claude-only、deprecated 與發布工具不會進入可用 skills。Matt、Cloudflare、i-have-adhd 與 Addy 更新均由獨立 policy 控制，並須經 Pull Request 人工審查。

## 安裝

### 集中式安裝

Windows：

```powershell
git clone https://github.com/wsx52114-star/skills-for-antigravity.git "$HOME\.agents"
```

WSL／Raspberry Pi 5：

```bash
git clone https://github.com/wsx52114-star/skills-for-antigravity.git ~/.agents
```

如果目標目錄已存在，先備份並確認內容。

### 專案連結

開發專案可透過 flat Symlink／Junction 共用 Agent home 的 skills 與 rules，同時保留
project-local 的 `CONTEXT.md` 與 ADR。WSL、Linux、Raspberry Pi、
Windows、Link／Copy Mode、Git ignore 與安全行為詳見
[專案 Agent Skills 啟用指南](PROJECT_SETUP.md)。
## 更新

Windows：

```powershell
git -C "$HOME\.agents" pull --ff-only
```

WSL／Raspberry Pi 5：

```bash
git -C ~/.agents pull --ff-only
```

## 使用 skills

直接用自然語言描述需求。Antigravity 會依 skill description 選擇工作流程，並在執行前讀取對應的 `SKILL.md`。

例如：

- 「這個 API 一直失敗，請幫我 diagnose。」
- 「用 TDD 實作登入流程。」
- 「先做 domain modeling，把術語釐清。」
- 「用 grill-with-docs 挑戰這個設計。」
- 「對這個 repository 做 security audit。」

## Skills 關鍵字與用途

下表以 skill name 作為關鍵字。完成專案初始化後，可輸入 `/skill-name`，也可在自然語言中明確提到 `skill-name`；標示
「需明確指定」的 skill 只有在使用者點名時才會執行，「可自動選用」則可由
Antigravity 依需求與 frontmatter description 判斷是否使用。

### Lifecycle

六個入口皆需明確指定；每次只執行一個階段並停在下一個核准點。

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`spec`](skills/lifecycle/spec/SKILL.md) | 需明確指定 | 定義並核准可驗證的規格。 |
| [`planning`](skills/lifecycle/planning/SKILL.md) | 需明確指定 | 將核准規格拆成依賴有序的 vertical slices。 |
| [`build`](skills/lifecycle/build/SKILL.md) | 需明確指定 | 實作下一個核准 slice 並提供證據。 |
| [`test`](skills/lifecycle/test/SKILL.md) | 需明確指定 | 依 acceptance criteria 證明行為與回歸狀態。 |
| [`review`](skills/lifecycle/review/SKILL.md) | 需明確指定 | 執行品質與風險 gates，回傳整合決策。 |
| [`ship`](skills/lifecycle/ship/SKILL.md) | 需明確指定 | 判斷發布就緒程度並準備 rollout 與 rollback。 |

### Engineering

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`ask-matt`](skills/engineering/ask-matt/SKILL.md) | 需明確指定 | 詢問目前情境適合使用哪個 skill 或工作流程。 |
| [`code-review`](skills/engineering/code-review/SKILL.md) | 可自動選用 | 從指定基準審查變更，分別檢查 Standards 與 Spec。 |
| [`codebase-design`](skills/engineering/codebase-design/SKILL.md) | 可自動選用 | 使用 deep module 詞彙設計介面、接縫與可測試性。 |
| [`diagnosing-bugs`](skills/engineering/diagnosing-bugs/SKILL.md) | 可自動選用 | 重現並縮小 bug，驗證假設、修復問題及加入回歸測試。 |
| [`domain-modeling`](skills/engineering/domain-modeling/SKILL.md) | 可自動選用 | 建立專案術語、領域關係與必要的架構決策。 |
| [`grill-with-docs`](skills/engineering/grill-with-docs/SKILL.md) | 需明確指定 | 透過追問釐清設計，同步 glossary 與 ADR。 |
| [`implement`](skills/engineering/implement/SKILL.md) | 需明確指定 | 依據 spec 或 tickets 實作工作項目。 |
| [`improve-codebase-architecture`](skills/engineering/improve-codebase-architecture/SKILL.md) | 需明確指定 | 掃描 codebase 的 deepening 機會，產生報告並逐項釐清。 |
| [`prototype`](skills/engineering/prototype/SKILL.md) | 可自動選用 | 建立 throwaway prototype，回答狀態、邏輯或 UI 設計問題。 |
| [`research`](skills/engineering/research/SKILL.md) | 可自動選用 | 依高可信度 primary sources 研究問題並在 repository 保存報告。 |
| [`resolving-merge-conflicts`](skills/engineering/resolving-merge-conflicts/SKILL.md) | 可自動選用 | 解決進行中的 Git merge 或 rebase conflict。 |
| [`setup-matt-pocock-skills`](skills/engineering/setup-matt-pocock-skills/SKILL.md) | 需明確指定 | 首次使用前設定 issue tracker、triage labels 與 domain docs。 |
| [`tdd`](skills/engineering/tdd/SKILL.md) | 可自動選用 | 以 red-green-refactor 和整合測試開發功能或修復 bug。 |
| [`to-spec`](skills/engineering/to-spec/SKILL.md) | 需明確指定 | 將已確認的對話整理成 spec 並發布到專案 issue tracker。 |
| [`to-tickets`](skills/engineering/to-tickets/SKILL.md) | 需明確指定 | 將 plan 或 spec 切成 tracer-bullet issues 並記錄 blocking edges。 |
| [`triage`](skills/engineering/triage/SKILL.md) | 需明確指定 | 依 triage role state machine 分類、驗證 issues 與外部 PR。 |
| [`wayfinder`](skills/engineering/wayfinder/SKILL.md) | 需明確指定 | 將跨多個 agent session 的大型工作規劃成 decision issues。 |
| [`wizard`](skills/engineering/wizard/SKILL.md) | 可自動選用 | 產生互動式 Bash wizard，引導人工完成 credentials、dashboard 或 cutover。 |

### Addy Specialists

這些 model-invoked skills 是 lifecycle 的專業實作層；`using-agent-skills` 與重疊的 TDD、debug、review router 不會匯入。

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`api-and-interface-design`](skills/addyosmani-pack/skills/api-and-interface-design/SKILL.md) | 可自動選用 | 設計穩定的公開 interface 與錯誤語意。 |
| [`ci-cd-and-automation`](skills/addyosmani-pack/skills/ci-cd-and-automation/SKILL.md) | 可自動選用 | 建立 CI/CD 與自動化 quality gates。 |
| [`code-simplification`](skills/addyosmani-pack/skills/code-simplification/SKILL.md) | 可自動選用 | 在保持行為不變下簡化程式碼。 |
| [`deprecation-and-migration`](skills/addyosmani-pack/skills/deprecation-and-migration/SKILL.md) | 可自動選用 | 規劃 deprecation、相容期與 migration。 |
| [`observability-and-instrumentation`](skills/addyosmani-pack/skills/observability-and-instrumentation/SKILL.md) | 可自動選用 | 建立 logging、metrics、tracing 與 alerting。 |
| [`performance-optimization`](skills/addyosmani-pack/skills/performance-optimization/SKILL.md) | 可自動選用 | 以量測與 profiling 驗證效能改善。 |
| [`security-and-hardening`](skills/addyosmani-pack/skills/security-and-hardening/SKILL.md) | 可自動選用 | 在實作階段處理 trust boundary 與防護。 |
| [`shipping-and-launch`](skills/addyosmani-pack/skills/shipping-and-launch/SKILL.md) | 可自動選用 | 準備 staged rollout、monitoring 與 rollback。 |
| [`source-driven-development`](skills/addyosmani-pack/skills/source-driven-development/SKILL.md) | 可自動選用 | 依官方文件驗證 framework 與 library 決策。 |

### Security

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`security-audit`](skills/security/security-audit/SKILL.md) | 可自動選用 | 稽核 codebase，尋找並驗證具有實際影響的可利用安全問題。 |

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
| [`to-questionnaire`](skills/productivity/to-questionnaire/SKILL.md) | 需明確指定 | 將無法自行回答的決策整理成 questionnaire。 |
| [`wait-what`](skills/productivity/wait-what/SKILL.md) | 需明確指定 | 要求以不同方式重新說明未能理解的內容。 |
| [`writing-for-agents`](skills/productivity/writing-for-agents/SKILL.md) | 可自動選用 | 撰寫或修改給 Agent 使用的 skills 與規則文件。 |

### In Progress

以下 skills 仍在開發中，行為可能隨上游更新而改變。

| 關鍵字 | 觸發方式 | 用途 |
| --- | --- | --- |
| [`loop-me`](skills/in-progress/loop-me/SKILL.md) | 需明確指定 | 針對想建立的 workflows 進行規格訪談。 |
| [`setup-ts-deep-modules`](skills/in-progress/setup-ts-deep-modules/SKILL.md) | 需明確指定 | 為 TypeScript repository 設定 dependency-cruiser 與 deep module 邊界。 |
| [`writing-beats`](skills/in-progress/writing-beats/SKILL.md) | 需明確指定 | 將原始素材組合成有先後脈絡的文章 beats。 |
| [`writing-fragments`](skills/in-progress/writing-fragments/SKILL.md) | 需明確指定 | 探索並蒐集尚未組織的寫作 fragments。 |
| [`writing-shape`](skills/in-progress/writing-shape/SKILL.md) | 需明確指定 | 將原始素材逐段整理成文章。 |

常見工程流程：

```text
/spec → /planning → /build → /test → /review → /ship
```

這份索引是目前 Runtime skills 的閱讀入口；各 skill 的 frontmatter 與完整行為仍以
自己的 `SKILL.md` 為準。[`rules/skills.md`](rules/skills.md) 負責 workspace 內的觸發、編排與
Antigravity 轉譯。

## 專案文件

每個開發專案自行保存 `.agents/CONTEXT.md` 與 `.agents/docs/adr/`；共享的 skills
與 rules 僅以機器本機連結接入。專案若需要特殊操作規則，可自行維護根目錄
`AGENTS.md`。完整目錄結構與 Git 管理方式見
[PROJECT_SETUP.md](PROJECT_SETUP.md)。

## 維護

上游採用政策、自動同步與驗證方式見 [MAINTENANCE.md](MAINTENANCE.md)。上游授權保留於 [LICENSE](LICENSE)。

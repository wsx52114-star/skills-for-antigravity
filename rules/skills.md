---
trigger: always_on
glob:
description: Antigravity Dynamic Skill Index
---

# Antigravity Agent Skills Index

You have access to several behavioral skills. **Whenever the user's prompt matches the trigger description for a skill, you MUST use the `view_file` tool to read the corresponding SKILL.md file BEFORE taking any other action.** 
Do NOT guess the workflow. Always read the file first to get the detailed steps.

**Important**: 
- **Domain Language & Framework Docs**: Both project domain language and agent framework documentation are unified in `.agents/CONTEXT.md`.
- **Architecture Decisions (ADR)**: All generated ADRs should be written to `.agents/docs/adr/`. Do NOT use the root directory.

## Golden Workflow for New Features

When the user requests a **new feature** (not a bug fix or minor tweak), you MUST NOT jump straight into writing code or a flat implementation plan. Instead, orchestrate the following phased skill execution:

### Phase 1 — Architecture Grilling (REQUIRED, then STOP)
1. Invoke the `grill-with-docs` skill (read `.agents/skills/engineering/grill-with-docs/SKILL.md` first).
2. Run the grilling session: challenge the plan against `.agents/CONTEXT.md`, sharpen terminology, and update the file and ADRs in `.agents/docs/adr/` as decisions crystallise.
3. **STOP. Request user approval before proceeding.** Do NOT continue to Phase 2 until the user explicitly confirms.

### Phase 2 — Issue Breakdown (after user approval)
4. Invoke the `to-issues` skill (read `.agents/skills/engineering/to-issues/SKILL.md` first).
5. Break the confirmed plan into independently executable issues (vertical slices). Present the issue list to the user.

### Phase 3 — Implementation (per issue)
6. For each issue, invoke the `tdd` skill (read `.agents/skills/engineering/tdd/SKILL.md` first).
7. Follow strict red-green-refactor: write failing test → implement → pass → refactor.

### Phase 4 — Diagnosis (on-demand)
8. If any unexpected error or regression arises at any point in Phase 3, **immediately** invoke the `diagnose` skill (read `.agents/skills/engineering/diagnose/SKILL.md` first) before making any guesses or blind fixes.

> This phased workflow applies ONLY to new feature development. For bug fixes, minor tweaks, or refactors, proceed directly with the appropriate skill without this orchestration.

## Available Skills

This index tracks 29 skills under `.agents/skills/`. Use the short trigger/use-case text to choose a skill, then read that skill's `SKILL.md` before execution.

### Engineering

| Skill | Trigger / Use | Path |
|---|---|---|
| `diagnose` | Bugs, errors, failing flows, regressions, performance issues. | `.agents/skills/engineering/diagnose/SKILL.md` |
| `grill-with-docs` | Stress-test a plan against `.agents/CONTEXT.md`; update domain docs/ADRs. | `.agents/skills/engineering/grill-with-docs/SKILL.md` |
| `improve-codebase-architecture` | Find refactors, coupling, testability, architecture improvements. | `.agents/skills/engineering/improve-codebase-architecture/SKILL.md` |
| `prototype` | Throwaway prototype for state, business logic, UI, or design options. | `.agents/skills/engineering/prototype/SKILL.md` |
| `setup-matt-pocock-skills` | Set up issue tracker, triage labels, and agent docs for engineering skills. | `.agents/skills/engineering/setup-matt-pocock-skills/SKILL.md` |
| `tdd` | TDD, red-green-refactor, tests-first feature or bug work. | `.agents/skills/engineering/tdd/SKILL.md` |
| `to-issues` | Convert a plan, PRD, or spec into executable issues. | `.agents/skills/engineering/to-issues/SKILL.md` |
| `to-prd` | Turn conversation context into a PRD. | `.agents/skills/engineering/to-prd/SKILL.md` |
| `triage` | Create, review, label, or route issues through triage. | `.agents/skills/engineering/triage/SKILL.md` |
| `zoom-out` | Explain broader architecture/context for unfamiliar code. | `.agents/skills/engineering/zoom-out/SKILL.md` |

### Productivity

| Skill | Trigger / Use | Path |
|---|---|---|
| `caveman` | Ultra-brief mode: caveman, less tokens, be brief, `/caveman`. | `.agents/skills/productivity/caveman/SKILL.md` |
| `grill-me` | Stress-test a plan/design through questioning. | `.agents/skills/productivity/grill-me/SKILL.md` |
| `handoff` | Compact the conversation into a handoff document. | `.agents/skills/productivity/handoff/SKILL.md` |
| `teach` | Teach a skill or concept in this workspace. | `.agents/skills/productivity/teach/SKILL.md` |
| `write-a-skill` | Create or update an agent skill. | `.agents/skills/productivity/write-a-skill/SKILL.md` |

### Misc

| Skill | Trigger / Use | Path |
|---|---|---|
| `git-guardrails-claude-code` | Block dangerous git commands in Claude Code. | `.agents/skills/misc/git-guardrails-claude-code/SKILL.md` |
| `migrate-to-shoehorn` | Replace TypeScript test `as` assertions with `@total-typescript/shoehorn`. | `.agents/skills/misc/migrate-to-shoehorn/SKILL.md` |
| `scaffold-exercises` | Scaffold exercise sections, problems, solutions, explainers. | `.agents/skills/misc/scaffold-exercises/SKILL.md` |
| `setup-pre-commit` | Configure Husky, lint-staged, Prettier, type checks, tests. | `.agents/skills/misc/setup-pre-commit/SKILL.md` |

### Personal

| Skill | Trigger / Use | Path |
|---|---|---|
| `edit-article` | Edit, revise, restructure, or tighten article drafts. | `.agents/skills/personal/edit-article/SKILL.md` |
| `obsidian-vault` | Search, create, or organize Obsidian notes. | `.agents/skills/personal/obsidian-vault/SKILL.md` |

### In Progress

| Skill | Trigger / Use | Path |
|---|---|---|
| `review` | Review branch/PR/WIP changes since a fixed point. | `.agents/skills/in-progress/review/SKILL.md` |
| `writing-beats` | Shape raw material into article beats. | `.agents/skills/in-progress/writing-beats/SKILL.md` |
| `writing-fragments` | Gather raw writing fragments for a future article. | `.agents/skills/in-progress/writing-fragments/SKILL.md` |
| `writing-shape` | Turn markdown raw material into a publishable article. | `.agents/skills/in-progress/writing-shape/SKILL.md` |

### Deprecated

| Skill | Trigger / Use | Path |
|---|---|---|
| `design-an-interface` | Explore multiple API/interface designs. | `.agents/skills/deprecated/design-an-interface/SKILL.md` |
| `qa` | Conversational QA session that files issues. | `.agents/skills/deprecated/qa/SKILL.md` |
| `request-refactor-plan` | Interview-driven refactor plan split into small commits/issues. | `.agents/skills/deprecated/request-refactor-plan/SKILL.md` |
| `ubiquitous-language` | Extract DDD-style glossary/domain language. | `.agents/skills/deprecated/ubiquitous-language/SKILL.md` |


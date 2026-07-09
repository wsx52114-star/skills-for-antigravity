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
1. Invoke the `grill-with-docs` skill (read `~/.gemini/config/skills/grill-with-docs/SKILL.md` first).
2. Run the grilling session: challenge the plan against `.agents/CONTEXT.md`, sharpen terminology, and update the file and ADRs in `.agents/docs/adr/` as decisions crystallise.
3. **STOP. Request user approval before proceeding.** Do NOT continue to Phase 2 until the user explicitly confirms.

### Phase 2 — Issue Breakdown (after user approval)
4. Invoke the `to-issues` skill (read `~/.gemini/config/skills/to-issues/SKILL.md` first).
5. Break the confirmed plan into independently executable issues (vertical slices). Present the issue list to the user.

### Phase 3 — Implementation (per issue)
6. For each issue, invoke the `tdd` skill (read `~/.gemini/config/skills/tdd/SKILL.md` first).
7. Follow strict red-green-refactor: write failing test → implement → pass → refactor.

### Phase 4 — Diagnosis (on-demand)
8. If any unexpected error or regression arises at any point in Phase 3, **immediately** invoke the `diagnosing-bugs` skill (read `~/.gemini/config/skills/diagnosing-bugs/SKILL.md` first) before making any guesses or blind fixes.

> This phased workflow applies ONLY to new feature development. For bug fixes, minor tweaks, or refactors, proceed directly with the appropriate skill without this orchestration.

## Available Skills

This index tracks 30 active skills under `~/.gemini/config/skills/`. Use the short trigger/use-case text to choose a skill, then read that skill's `SKILL.md` before execution.

### Engineering

| Skill | Trigger / Use | Path |
|---|---|---|
| `diagnosing-bugs` | Bugs, errors, failing flows, regressions, performance issues. | `~/.gemini/config/skills/diagnosing-bugs/SKILL.md` |
| `code-review` | Review changes since a fixed point (commit, branch, tag) along Standards and Spec axes. | `~/.gemini/config/skills/code-review/SKILL.md` |
| `codebase-design` | Design deep modules (small interface, deep implementation) and seams. | `~/.gemini/config/skills/codebase-design/SKILL.md` |
| `domain-modeling` | Build and sharpen a project's domain model (glossary, ubiquitous language, ADRs). | `~/.gemini/config/skills/domain-modeling/SKILL.md` |
| `grill-with-docs` | Stress-test a plan against `.agents/CONTEXT.md`; update domain docs/ADRs. | `~/.gemini/config/skills/grill-with-docs/SKILL.md` |
| `implement` | Implement a piece of work based on a PRD or set of issues. | `~/.gemini/config/skills/implement/SKILL.md` |
| `improve-codebase-architecture` | Find refactors, coupling, testability, architecture improvements. | `~/.gemini/config/skills/improve-codebase-architecture/SKILL.md` |
| `prototype` | Throwaway prototype for state, business logic, UI, or design options. | `~/.gemini/config/skills/prototype/SKILL.md` |
| `resolving-merge-conflicts` | Resolve an in-progress git merge/rebase conflict. | `~/.gemini/config/skills/resolving-merge-conflicts/SKILL.md` |
| `security-audit` | Security audit of a codebase (find security bugs, review vulnerabilities, pen-testing). | `~/.gemini/config/skills/security-audit/SKILL.md` |
| `setup-matt-pocock-skills` | Set up issue tracker, triage labels, and agent docs for engineering skills. | `~/.gemini/config/skills/setup-matt-pocock-skills/SKILL.md` |
| `tdd` | TDD, red-green-refactor, tests-first feature or bug work. | `~/.gemini/config/skills/tdd/SKILL.md` |
| `to-issues` | Convert a plan, PRD, or spec into executable issues. | `~/.gemini/config/skills/to-issues/SKILL.md` |
| `to-prd` | Turn conversation context into a PRD. | `~/.gemini/config/skills/to-prd/SKILL.md` |
| `triage` | Create, review, label, or route issues through triage. | `~/.gemini/config/skills/triage/SKILL.md` |

### Productivity

| Skill | Trigger / Use | Path |
|---|---|---|
| `grill-me` | Stress-test a plan/design through questioning. | `~/.gemini/config/skills/grill-me/SKILL.md` |
| `grilling` | Interview the user relentlessly about a plan or design. | `~/.gemini/config/skills/grilling/SKILL.md` |
| `handoff` | Compact the conversation into a handoff document. | `~/.gemini/config/skills/handoff/SKILL.md` |
| `teach` | Teach a skill or concept in this workspace. | `~/.gemini/config/skills/teach/SKILL.md` |
| `writing-great-skills` | Reference for writing and editing skills well. | `~/.gemini/config/skills/writing-great-skills/SKILL.md` |

### Misc

| Skill | Trigger / Use | Path |
|---|---|---|
| `git-guardrails-claude-code` | Block dangerous git commands via Antigravity rules. | `~/.gemini/config/skills/git-guardrails-claude-code/SKILL.md` |
| `migrate-to-shoehorn` | Replace TypeScript test `as` assertions with `@total-typescript/shoehorn`. | `~/.gemini/config/skills/migrate-to-shoehorn/SKILL.md` |
| `scaffold-exercises` | Scaffold exercise sections, problems, solutions, explainers. | `~/.gemini/config/skills/scaffold-exercises/SKILL.md` |
| `setup-pre-commit` | Configure Husky, lint-staged, Prettier, type checks, tests. | `~/.gemini/config/skills/setup-pre-commit/SKILL.md` |

### Personal

| Skill | Trigger / Use | Path |
|---|---|---|
| `edit-article` | Edit, revise, restructure, or tighten article drafts. | `~/.gemini/config/skills/edit-article/SKILL.md` |
| `obsidian-vault` | Search, create, or organize Obsidian notes. | `~/.gemini/config/skills/obsidian-vault/SKILL.md` |

### In Progress

| Skill | Trigger / Use | Path |
|---|---|---|
| `decision-mapping` | Map out and sequence a series of technical design decisions (excluding manual tasks). | `~/.gemini/config/skills/decision-mapping/SKILL.md` |
| `wayfinder` | Chart a route through a foggy problem (using research, prototypes, grilling, and tasks). | `~/.gemini/config/skills/wayfinder/SKILL.md` |
| `writing-beats` | Shape raw material into article beats. | `~/.gemini/config/skills/writing-beats/SKILL.md` |
| `writing-fragments` | Gather raw writing fragments for a future article. | `~/.gemini/config/skills/writing-fragments/SKILL.md` |
| `writing-shape` | Turn markdown raw material into a publishable article. | `~/.gemini/config/skills/writing-shape/SKILL.md` |

## Domain & Tech Stack Adaptation Layer

Adapt generic skills (TDD, Diagnose, Architecture, Tooling) based on the workspace tech stack:
- **Frontend Web**: Vitest/Jest/Playwright/Cypress; mock API (MSW); browser DevTools (Console/Network/React DevTools); decouple state from UI.
- **Backend Services**: Test endpoints using memory DBs/fakes (no over-mocking); analyze logs/profiles/debuggers; separate business logic.
- **Firmware & Embedded**: Host-side testing (mock HAL/registers); SWD/JTAG (GDB/OpenOCD), logic analyzer, RTT; hide registers; no malloc in ISRs.
- **Python & Automation**: pytest/unittest; mock filesystem/requests; modular libraries; use linters (pylint, black, mypy) in venv.
- **Specs & Issues**: Web gates auth/data schemas; Embedded gates physical pinout, memory constraints, real-time latency.


## Agent Harness & Platform Adaptation Layer

When loading and executing skills from the `~/.gemini/config/skills/` directory, you MUST dynamically adapt and translate any Claude Code specific configurations or references to Antigravity's environment. Follow these translation rules strictly:

1. **Rule File Mapping (`CLAUDE.md` ➔ `AGENTS.md`)**:
   - If a skill (e.g., `setup-matt-pocock-skills`) instructs you to explore, create, or update `CLAUDE.md`, you MUST redirect the operations to **`.agents/AGENTS.md`** instead. Do NOT create or edit `CLAUDE.md` in the repository root.

2. **Git Guardrail Translation**:
   - When encountering `git-guardrails-claude-code`, do NOT attempt to write hooks to `.claude/settings.json` or create `PreToolUse` bash configurations.
   - Instead, translate the action to writing Git restriction guidelines directly into **`.agents/AGENTS.md`** under a `## Git Safety Rules` section, ensuring the agent model limits itself.

3. **Slash Command Execution**:
   - If documentation or comments refer to slash commands (e.g., `/setup-matt-pocock-skills`, `/triage`), they are mapped to natural language keywords (e.g., "setup-matt-pocock-skills", "triage") in Antigravity.

## Project Override (This Skill Repo Only)

* **Context**: This codebase is the Agent Skills adaptation library itself.
* **Overrides**: Skip global rules regarding Python/Hardware interfaces (Pi5, Triac, PSU, etc.) and hardware debugging guidelines. Adapt behaviors directly to documentation, scripts (Python/JS/Shell), and skill structure edits.


---
name: design-review
description: Cold-review a spec or design document using parallel fresh-context subagents before slicing issues, routing, or implementation.
disable-model-invocation: true
---

# Design Review

Two-axis cold review of a spec, architectural plan, or hardware design document before downstream work (`to-tickets`, coding, PCB layout, or fabrication).

## Process

### 1. Pin the target artifact

Resolve the target document from the user's argument: a file path, issue tracker reference, or project design notes (`docs/`, `specs/`, `.scratch/`, `DESIGN_NOTES.md`, or `.agents/docs/hardware-design-notes.md`). If missing or ambiguous, ask before proceeding.

Confirm the target exists and is non-empty before spawning subagents.

### 2. Collect ground-truth pointers (domain auto-detection)

Scan the current project for authoritative references to pass as pointers:

- **Shared**: `.agents/CONTEXT.md` (or root `CONTEXT.md` / `GLOSSARY.md`), `.agents/docs/adr/` (or `docs/adr/`), `.agents/CONTEXT-MAP.md` (or root `CONTEXT-MAP.md` / `GLOSSARY-MAP.md`).
- **Software** (when present): referenced modules or test seams, `CODING_STANDARDS.md`, root `AGENTS.md`.
- **Hardware / embedded** (when present): `DESIGN_NOTES.md` (or `.agents/docs/hardware-design-notes.md`), `.kicad_pro`, `.kicad_dru`, cross-board interconnect or pin-map tables, and firmware/control pin or protocol definitions across the hardware-software boundary.

**Thin-spec calibration**: If the target follows `to-spec` (deliberately omitting file paths and code snippets), flag that convention explicitly in both subagent prompts so reviewers evaluate contracts, seams, and testable external behaviour rather than reporting absent file paths or code snippets.

### 3. Enforce cold isolation (Fail-closed)

Spawn two read-only subagents in parallel in **fresh context windows** with **zero prior conversation history**. Pass only the target artifact and pointer list from Step 2—exclude brainstorming chat, verbal caveats, and author rationale.

If the host environment cannot spawn genuinely isolated fresh-context subagents, stop immediately and report the limitation instead of simulating a cold review in the current conversation.

### 4. Run both axes in parallel

**Cold Comprehension & Assumptions subagent** (pass *target artifact + `CONTEXT.md` / `GLOSSARY.md` glossary ONLY*; keep it intentionally codebase-blind):

> "Cold-read this spec/design document with no codebase access. Report, quoting exact target lines: (a) unstated assumptions or logical leaps a cold reader must guess; (b) undefined terms or terms conflicting with the glossary; (c) missing edge cases, failure modes, or ambiguous acceptance/scope boundaries; (d) whether the document is clear enough to slice into issues or execute directly. Respect thin-spec omissions if noted. Under 400 words."

**Ground-Truth & Risk Alignment subagent** (pass *target artifact + ADRs + codebase / hardware & interface pointers from Step 2*):

> "Audit this spec/design document against the project's real state. Report, citing both the target line and the conflicting source file/line: (a) contradictions with existing code, ADRs, electrical/mechanical constraints, `.kicad_pro`/`.kicad_dru`, or hardware-firmware pin/protocol contracts; (b) simpler existing seams, or speculative scope / over-engineering; (c) hard-to-reverse hazards (safety, HV/isolation, migration, data integrity, fabrication or bring-up risk). Respect thin-spec omissions if noted. Under 400 words."

### 5. Aggregate and stop for human decision

Present both reports under `## Cold Comprehension & Assumptions` and `## Ground-Truth & Risk Alignment`, verbatim or lightly cleaned. Do **not** merge or rerank findings across axes.

End with a one-line summary per axis: total findings and the worst issue within each axis (if any).

**Stop gate**: Wait for the user to decide what to revise or accept before editing the spec or starting downstream execution (`to-tickets`, `implement`, PCB layout, or fabrication).

## Why two axes

A design can pass one axis and fail the other:

- Readable, self-consistent prose can still contradict real code, ADRs, `.kicad_pro` rules, or pin maps.
- Technically aligned designs can still hide unspoken assumptions from the brainstorming chat.

Keeping the comprehension reviewer codebase-blind stops implementation context from masking prose gaps.

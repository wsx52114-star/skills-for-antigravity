---
name: doc-drift
description: Audit long-lived project documentation (CONTEXT.md, ADRs, specs, DESIGN_NOTES.md, pin maps) against current code and hardware interfaces for drift.
disable-model-invocation: true
---

# Documentation Drift Audit

Audit accumulated drift between long-lived project documentation and the current implementation state using fresh-context read-only subagent(s).

## Tool Boundaries

- **Defer KiCad-internal parity** (`.kicad_sch` ↔ `.kicad_pcb` ↔ BOM/POS) to `kicad-release` (`kicad-cli` ERC, DRC, and `--schematic-parity`)—deterministic EDA checks outrank LLM inspection. Use `doc-drift` for `DESIGN_NOTES.md`, interconnect/pin-map tables, and hardware-to-firmware/control contracts.
- **Defer single-branch diff vs. one originating spec** to `code-review`.

## Process

### 1. Scope the target documents

Use user-specified paths or subsystems when supplied. Otherwise, discover long-lived docs in the **current project** (never the Agent home `~/.agents/`):

- `.agents/CONTEXT.md` (or root `CONTEXT.md` / `GLOSSARY.md`) and `.agents/CONTEXT-MAP.md` (or root `CONTEXT-MAP.md` / `GLOSSARY-MAP.md`)
- `.agents/docs/adr/*.md` (or `docs/adr/*.md`)
- Checked-in specs (`docs/`, `specs/`), `CODING_STANDARDS.md`, root `AGENTS.md`
- `DESIGN_NOTES.md` (or `.agents/docs/hardware-design-notes.md`), interconnect/pin-map tables, and referenced firmware/control modules (GPIO, I2C, SPI, Serial, MQTT topic/payload definitions)

If more than ~8 documents are discovered without a narrowed subsystem, list the candidates and ask the user to narrow the scope before spawning subagents.

### 2. Enforce cold isolation (Fail-closed)

Spawn fresh-context read-only subagent(s) with **zero prior conversation history**, passing only the scoped document paths and implementation roots.

- For narrow scopes (one doc or subsystem), spawn a single fresh subagent.
- When scope spans both **Vocabulary & ADR Validity** and **Spec & Interface Parity**, split into two parallel fresh subagents.

If the host environment cannot spawn genuinely isolated fresh-context subagents, stop immediately and report the limitation instead of auditing in the current conversation.

### 3. Classify drift with dual citations

Instruct each subagent to inspect the scoped docs against current code/configs and report findings ordered by severity (safety and hardware-software interface breakages first). Every finding must cite **both** the exact document path/line and the contradicting code/config/interface file/line.

Classify each finding into one of three categories:

- **Contradicted**: Implementation violates or diverged from the doc (renamed symbols/topics, changed pinouts, superseded ADR still marked Accepted).
- **Missing / Undocumented**: Material public interface, pin assignment, or architectural change has no corresponding doc record.
- **Stale / Orphaned**: Doc references deleted modules, retired components/parameters, or unused glossary terms.

Suggest a likely resolution (`Update doc`, `Fix implementation`, or `Supersede ADR`) as a judgement call. Cap each subagent report under 500 words.

### 4. Report and stop gate

Present findings grouped by document (or per parallel axis when split), ending with a one-line summary of `Contradicted / Missing / Stale` counts.

**Stop gate**: Leave both documentation and code untouched until the user chooses which items to update or fix (keeping `CONTEXT.md` / `GLOSSARY.md` glossary-only and avoiding changelog-style ADRs).

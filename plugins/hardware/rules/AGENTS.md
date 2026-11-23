# KiCad Hardware & PCB Rules

- Follow the hardware workflow chain: `kicad-schematic` (five upfront parameters and cross-board interconnect tables) -> `kicad-pcb` (new-board planning, routing geometry, copper pours, and layer reduction) -> `kicad-release` (KiCad 10 CLI ERC/DRC/parity checks and manufacturing export).
- Respect KiCad project single sources of truth: `.kicad_pro` (Netclasses and fab minimums), `.kicad_dru` (custom DRC rules), and project hardware design notes (`DESIGN_NOTES.md` or `.agents/docs/hardware-design-notes.md`). Keep `.agents/CONTEXT.md` glossary-only and `DESIGN.md` for UI.
- For new boards, obtain explicit user approval at each planning stage, specifically for layer count and blind/buried drill spans.
- Work in root-level working copies with distinct basenames (or an isolated Git worktree) so `${KIPRJMOD}` local symbol and footprint tables stay valid; keep matching `.kicad_sch`, `.kicad_pro`, and `.kicad_dru` alongside the working `.kicad_pcb`.
- Permit `0 Ω` jumper resistors only on low-voltage nets after explicit user approval, and synchronize schematic, PCB, and BOM together.
- Enforce zero CLI ERC errors, zero DRC errors, zero unconnected items, and zero schematic-parity mismatches alongside pad/via center termination audits before generating manufacturing deliverables.

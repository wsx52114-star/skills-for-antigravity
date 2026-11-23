---
name: kicad-pcb
description: Plan a new KiCad board from a schematic, including board outline, thickness, layer count, via spans and placement. Configure .kicad_pro/.kicad_dru rules, review routing and copper zones, and plan four-layer power layouts or layer-reduction prototypes.
---

# KiCad PCB Layout, Routing, and Layer Reduction

For a **new board from a schematic**, follow [new-board planning](references/new-board-planning.md) before setting layout rules. Use the schematic's assigned footprints and opening constraints to propose a dimensioned floorplan and a manufacturable stackup. Obtain explicit user approval for each stage and for any change to an approved decision before applying it.

With the approved plan and ERC-clean schematic, set design rules, lock mechanics, route power and critical loops, route general signals, then refill zones and run DRC. For revisions, start from the confirmed project baseline.

## 1. Design Notes, Working Copy, and Constraint Files

- Read the project's hardware design notes first (e.g., `DESIGN_NOTES.md` or `.agents/docs/hardware-design-notes.md`; keep `.agents/CONTEXT.md` glossary-only and `DESIGN.md` for UI). Record project-specific width targets and minima, power and HV nets, ground topology, fixed parts and connectors, intentional routing exceptions, and verification commands in those notes.
- Before editing an existing board, keep a restorable baseline in durable storage (e.g., a dated copy, archive, or Git commit with any required support files).
- Work in an in-project copy using a distinct working basename at the project root (or an isolated Git worktree) so `${KIPRJMOD}` symbol/footprint library paths stay valid. Keep matching `.kicad_sch`, `.kicad_pro`, and `.kicad_dru` files under the working basename for DRC and parity checks.
- **Land rules in project files:** Write track widths, via defaults, and Netclasses into `.kicad_pro`, and write layer-specific, high-voltage creepage, or controlled-impedance custom rules into `.kicad_dru`. Treat fab minimums as manufacturing floors; size widths, vias, and clearances for thermal rise, voltage drop, and production margin. Assign explicit values to every power path.
- **Verify sync diffs and revision identity:** Before importing schematic updates, follow `kicad-schematic` to audit reference designators, footprints, pad nets, mechanical vs. electrical mounting pads, and intentional quirks (reversed headers, split grounds, DNP, jumpers). Keep prototype copies clearly labeled beside production boards so exports always target the confirmed revision.

## 2. General Routing, Pad/Via Entry, and Ground Rules

Apply these rules across all projects; document any intentional retained exceptions (such as high-power pads or via arrays) in the project's hardware design notes:

### Pad and Via Terminations (Both Sides)

- **Terminate at the center:** Every routed track endpoint must land directly on the **pad center or via center** on both `F.Cu` and `B.Cu`.
- **Enter along the natural approach:** Enter pads along the track's incoming direction—straight along the pad axis or diagonally at **45°**. If a small alignment bend is needed to hit the center, place it **inside** the pad or via copper. Avoid external detours, U-turns, or lateral offsets outside the pad just to straighten the final segment.
- **Reject invalid connections and stubs** (unless explicitly documented as an intentional exception):
  - Track stopping at the pad or via edge (copper contact only, no endpoint at center).
  - Track passing straight through a pad or via without an endpoint at center.
  - Via touching a pad with no track connected to the pad.
  - Dangling stubs extending from a pad/via center with an unconnected end, or duplicate/overlapping track segments.

### Routing Geometry, Widths, and Current Separation

- **90° and 45° routing only:** Route exclusively with 90° and 45° segments. Keep tracks short with minimal bends, and eliminate tiny fragmented segments.
- **Uniform track width:** Keep one consistent width along each entire track. Signal tracks must use the project-specified minimum signal width (defaulting to `0.25 mm` when unspecified by the project).
- **Power width and sense isolation:** Size power tracks for required current, temperature rise, and voltage drop; never shrink power track width for routing convenience. On revisions, preserve or improve existing power and high-current return widths and check their narrowest necks (pad entries, thermal reliefs, and vias) against the baseline. Route high-current paths and current-sense (Kelvin) lines separately from their designated sense pads.

### Vias, Grounding, and HV Spacing

- **Same-layer priority and via cleanup:** Route on the same layer whenever feasible and remove non-functional vias, while preserving parallel load-sharing vias on power nets and return vias at critical layer transitions.
- **Copper pours and star grounding:** Refill ground zones and check DRC. Where pours connect same-net ground pads and provide the return path, omit redundant thin point-to-point ground tracks. Preserve wide high-current ground return tracks and keep star-grounding split boundaries intact (join ground branches only at the schematic-designated star point, net tie, or bridging part). Inspect islands, zone priority, thermal reliefs, and cross-zone return continuity.
- **HV clearance and creepage:** Enforce working-voltage, pollution-degree, and safety-standard clearance and creepage across all copper layers, vias, pads, and board edges. Preserve or increase existing HV-to-LV spacing on revisions and report any baseline violations, neighbor-layer coupling, or external test-interface isolation gaps.

### Fixed Mechanics, Bottlenecks, and Jumpers

- **Lock fixed mechanics:** Keep board outline, mounting holes, and external connector positions fixed (any change requires explicit user approval). Lock keepouts and courtyards before routing, and place decoupling/bootstrap capacitors tight to their pins.
- **Resolve bottlenecks in order:** Adjust movable component placement, orientation, and fanout first, then re-route crossing branches as a group while holding widths and 90°/45° rules.
- **Low-voltage-only `0 Ω` jumpers:** Only low-voltage nets may use `0 Ω` jumper resistors (never high-voltage or isolation nets), and only after explicit user approval. Synchronize approved jumper or footprint changes across schematic, PCB, and BOM together.

## 3. Architecture-Specific Rules

- **Four-layer power boards:** Read [`references/power-4layer.md`](references/power-4layer.md) before routing to assign copper layer roles, reference planes, power/sense priority, and revision-to-revision copper comparisons.
- **Size-preserving layer reduction (e.g., 4-layer to 2-layer):** Read [`references/layer-reduction.md`](references/layer-reduction.md) first; preserve the confirmed original, branch a working copy, map inner-layer replacements, compare full-board DRC per group, and back-annotate approved low-voltage `0 Ω` jumpers via `kicad-schematic`.
- **Front-panel mechanics and cable egress:** Verify cable exit and mating space against physical connector orientation and user-facing sides first; ensure dimensions, thickness, copper weight, and routing match mechanical drawings and fab notes.

## 4. Agent Boundary, Verification, and Sign-Off Handoff

- **Agent vs. KiCad GUI boundary:** The agent may inspect/edit `.kicad_pro` Netclasses and `.kicad_dru` custom rules, parse `.kicad_pcb` stackup/widths/zones/nets/terminations, and analyze DRC coordinate reports. Interactive component placement and manual copper routing cannot be performed via `kicad-cli`; output coordinate-level recommendations and stop for the user to execute in KiCad GUI.
- **Mandatory per-change verification:** After every modification, refill zones and hand off to `kicad-release` to run full KiCad 10 CLI DRC (`--all-track-errors --schematic-parity --refill-zones`) and ERC, requiring **0 DRC errors, 0 unconnected items, 0 schematic-parity mismatches, and 0 ERC errors**. Additionally audit every pad and via for center endpoints, zero pass-through tracks, zero edge-only touches, zero dangling stubs, and zero duplicate overlapping segments.
- **Before write-back comparison and exception logging:** Before writing a revision back, follow `kicad-release`'s baseline-vs-candidate DRC workflow and compare width distributions, via counts, per-net lengths, angle compliance, and pad/via centering. Document all routing trade-offs and intentional retained exceptions (e.g., high-power pads, via arrays) in the project's hardware design notes.

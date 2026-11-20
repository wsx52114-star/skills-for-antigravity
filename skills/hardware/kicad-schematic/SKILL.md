---
name: kicad-schematic
description: Design, review, and sync KiCad schematics (.kicad_sch), opening electrical parameters, power trees/PWR_FLAG, footprints, BOM/DNP fields, front-panel FFC interconnects, shared GPIOs, tri-state LEDs, ADC key ladders, and ERC verification.
---

# KiCad Schematic Design and Synchronization

Applies to new designs, board revisions, multi-board interconnects, and jumper back-annotation from PCB layer reduction. Lock the five opening parameters before editing, then pass ERC before handing off to `kicad-pcb`.

## 1. Opening Design Parameters and Constraint Placement

Confirm and record these five parameter groups with the design owner before starting or revising a board:

| Group | Items to Define and Confirm | Project Value |
| --- | --- | --- |
| Mechanical | Board outline, thickness, mounting holes, fixed connector/switch locations, allowed placement sides, component height limits, enclosure clearances, and assembly orientation. | |
| Electrical | Input voltage range, rail loads, continuous and peak currents, allowable voltage drop and temperature rise; mains, isolation, or high-voltage standards and spacing rules. | |
| Fab capabilities | Stackup, copper weight per layer, minimum trace width/spacing, available drill sizes and annular rings, copper-to-edge clearance, and controlled-impedance requirements. | |
| Netclasses | Group nets into power, supply, general signal, clock/high-speed, analog sense, and high-voltage classes with width, clearance, via, and reference-plane targets. | |
| Revision & sign-off | Confirmed production file paths, prototype variants, approved mechanical/electrical interfaces, fab spec revision, and ERC/DRC acceptance gates. | |

Write checkable constraints into KiCad project configuration: put **Netclasses and fab minimums in `.kicad_pro`**, and put layer-specific or targeted clearance/impedance **custom DRC rules in `.kicad_dru`**. Every power path must have an assigned design target.

## 2. Schematic Design and PCB Sync Workflow

1. **Start from the latest confirmed baseline.** Continue from the last schematic and PCB confirmed by the design owner. Keep prototypes and working copies inside the project with clear revision naming while preserving project settings and local symbol/footprint libraries; clearly distinguish production vs. prototype files when finished.
2. **Verify power, ground, and signals stage by stage.** Label supply sources, voltages, grounding scheme, and cross-board interfaces. Check component power pins, pin electrical types/directions, and intentional no-connects. After tracing actual power feed paths (external inputs or passive links such as fuses), place `PWR_FLAG` where KiCad lacks an active power-output driver.
3. **Assign purchasable, assemblable footprints.** Verify datasheet dimensions, symbol pin numbers, pad numbers, pin-1 orientation, and polarity. Use unambiguous SMD passive footprints (such as `0402` or `0603`) rated for the required power, voltage, and assembly process. Align `DNP` and BOM fields (MPN, Value, Footprint) so schematic, PCB, and procurement files target the same BOM revision.
4. **Audit PCB update differences.** Before updating the PCB, review expected reference designators, footprints, pad-to-net assignments, and added/removed parts. Trace any pad-net mismatch across symbol pin numbers, footprint pad definitions, and existing copper. Confirm whether mounting/shield pads are mechanical-only or electrically connected before assigning pin numbers and symbol pins. Review info, warning, and error messages separately in the update preview.
5. **Document intentional design choices.** Mark reversed connectors, shared GPIOs, split grounds, DNP parts, and jumper resistors explicitly in the schematic or interconnect table. Sync any change to those choices across schematic, PCB, firmware pin maps, and BOM.

## 3. Architecture-Specific Rules

- **Front-panel and cross-board interconnects:** When designing FFC/header cables, shared GPIOs, tri-state LED matrices, or ADC resistor ladders, read [`references/panel-and-interconnect.md`](references/panel-and-interconnect.md) first and build the pin-mapping and state tables.
- **Split grounds and Kelvin sensing:** For split grounds (e.g., `GNDPWR`, `GND`, `GNDA`), explicitly specify the star point, net tie, or bridging component (`0 Ω` resistor) in the schematic. For shunt Kelvin sensing, distinguish the high-current branch from dedicated sense taps in the schematic.
- **Back-annotating `0 Ω` jumpers from layer reduction:** Confirm voltage drop, current rating, and BOM impact first; once approved, split the net in the schematic and sync the footprint, PCB, BOM, and assembly outputs.

## 4. Agent Boundary and Verification Gate

- **Agent vs. KiCad GUI boundary:** The agent may inspect `.kicad_sch`, `.kicad_pro`, `.kicad_dru`, and BOM fields, verify connectivity/footprint/DNP consistency, and run KiCad CLI checks. When schematic wiring edits, symbol placement, or GUI "Update PCB from Schematic" actions are required, output an itemized change list and stop for the user to apply or confirm in KiCad GUI.
- **Schematic ERC and parity gate:** Hand off to `kicad-release` to run KiCad 10 CLI ERC (`sch erc --severity-all --format json`) and post-sync parity (`--schematic-parity`). Require **0 ERC errors**, audit every warning and `ignored_checks` entry, and record approved exception rationales in the sign-off summary.

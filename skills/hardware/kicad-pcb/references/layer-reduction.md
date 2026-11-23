# Size-Preserving Layer Reduction Rules (e.g., 4-Layer to 2-Layer)

- **Preserve the original and inventory inner layers:** Keep the full 4-layer baseline untouched and create a dedicated prototype copy. Lock board outline, mounting holes, and external headers, then list every inner-layer trace, pour, and return path with an explicit 2-layer replacement plan.
- **Prioritize power and return paths; compare DRC per group:** Preserve power trace width, low-impedance ground return, HV isolation, and Kelvin sensing first. Re-route in order: power & supply → control & gate drive → peripherals & signal crossings. Refill zones and run full-board DRC after each group, comparing unconnected items and violations to keep only changes that improve overall connectivity within electrical limits.
- **Evaluate `0 Ω` jumpers (low-voltage only) and sync bidirectionally:** Where routing alone cannot cross without breaking critical copper, permit `0 Ω` jumper resistors **only on low-voltage nets** (never on high-voltage/isolation nets). Obtain explicit user approval after evaluating voltage drop, thermal load, and BOM impact, then place schematic-defined `0 Ω` resistors rated for the pad/branch current. Once adopted, split the nets in `kicad-schematic` and sync footprint, PCB, BOM, and assembly files; export manufacturing data exclusively from the prototype revision.

## Inner-Layer Migration and `0 Ω` Jumper Tracking Template

| Original Inner-Layer Net / Path | Replacement Strategy (Layer / Re-route / `0 Ω` Jumper) | Return & Current Check | Schematic / BOM Sync Status |
| --- | --- | --- | --- |
| Example: `VCC_5V` (`In2.Cu`) | Route on `B.Cu` at 0.8 mm; bridge crossing via `R99 (0 Ω, 0805)` | Verified 0805 current rating & via drop | Net split and BOM updated |

## Field Example (EMT1050 2-Layer Prototype)

Under a fixed mechanical outline, power paths and ground return were preserved first, candidate layouts were compared by full-board unconnected count, and four approved `0 Ω` jumpers were synchronized across schematic, PCB, and BOM while keeping shunt Kelvin sensing intact.

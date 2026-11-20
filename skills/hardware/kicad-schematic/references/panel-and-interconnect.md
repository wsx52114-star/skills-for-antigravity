# Front-Panel and Cross-Board Interconnect Rules

- **Mechanics and user orientation first:** Lock board outline, switch/LED positions, and real-world operating orientation first. Verify connector orientation, cable exit direction, and mating clearance against physical connector drawings before placing other parts.
- **Cross-board cable pin mapping:** Verify cable orientation (top/bottom contacts, same-side vs. reverse), pin numbering, power, and ground pin-by-pin. Record any intentional pin reversal explicitly in the wiring table and keep schematic and firmware in sync.
- **Shared GPIOs, tri-state LEDs, and ADC key ladders:**
  - **Shared GPIOs:** Define timing and pin states across boot, programming, debug, and normal operation to prevent electrical contention.
  - **Tri-state LED matrices:** Build a full truth/state table covering high-impedance (Hi-Z) states during scanning, current limiting, peak current, and ghosting margin.
  - **ADC key ladders:** Validate voltage bands per key against resistor tolerance, reference drift, and noise margin; define no-key and multi-key behaviors explicitly.
- **Cross-document consistency:** Keep panel dimensions, board thickness, copper weight, and routing rules consistent across PCB, mechanical drawings, and manufacturing outputs. Confirm any discrepancy with the design owner before export.

## Cross-Board Cable Mapping Template

| Mainboard Pin | Cable Conductor | Panel Pin | Net Name | Direction / Sharing Notes |
| --- | --- | --- | --- | --- |
| J1-1 | Pin 1 | J2-5 | `VCC_3V3` | Power out (intentional 1–5 ↔ 5–1 reversal) |
| J1-2 | Pin 2 | J2-4 | `LED_A` | Tri-state LED scan / boot Hi-Z |

## Field Example (EMT1050 Front Panel)

Five-pin FFC mapped mainboard pins `1–5` to panel pins `5–1`, three GPIOs tri-state scanned six LEDs, and five keys shared one ADC input; the interconnect table tracked physical pin order, pin sharing, and operational states. Recompute concrete values for each new board and enter them in the opening design parameters table.

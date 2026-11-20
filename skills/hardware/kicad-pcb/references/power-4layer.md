# Four-Layer Power Board Rules

- **Define all four copper roles and reference planes:** Before routing, lock layer roles for L1–L4 (e.g., Top components/signals + local power, In1 solid ground reference plane, In2 power distribution/secondary routing + reference copper, Bottom secondary parts/power return). Preserve continuous reference copper and place adjacent return/stitching vias at critical layer transitions.
- **Route power loops before control and sense lines:** Place and route connectors, power stages, shunts, decoupling, and bootstrap loops first. Once high-current and return loops are closed, route control signals and sensitive analog/Kelvin traces, checking reference-plane continuity across ground partitions.
- **Compare actual copper on board revisions:** Even with identical part and layer counts, compare old vs. revised boards under the same mechanical constraints for layer roles, power neck-downs, return paths, via counts, Kelvin isolation, and power-to-analog coupling.

## Stackup Planning Template

| Layer | Primary Role | Copper Weight | Reference Plane / Constraints |
| --- | --- | --- | --- |
| `F.Cu` (L1) | Main power devices, short direct routing, power pours | Per fab spec | References `In1.Cu`; keep sensitive lines out from under high-di/dt copper |
| `In1.Cu` (L2) | Primary ground reference (`GND` / split zones) | Per fab spec | Keep continuous; prevent long slots cutting return paths |
| `In2.Cu` (L3) | Power rails and secondary signal routing | Per fab spec | Verify adjacent reference continuity when crossing split-ground boundaries |
| `B.Cu` (L4) | Auxiliary signals, thermal copper, low-frequency/bottom links | Per fab spec | Enforce HV clearance/creepage and courtyard constraints |

## Field Example (EMT1050 4-Layer Mainboard)

`GNDPWR`, `GND`, and `GNDA` joined only through schematic-specified `0 Ω` resistors; shunt power branches and Kelvin sense traces routed independently from designated pads, and return continuity was audited across inner and outer copper layers.

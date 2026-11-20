# New-board planning from an assigned schematic

## Establish the physical and electrical constraints

- Use the part numbers, footprints and pin assignments confirmed in the schematic. Record the build quantity, assembly method, permitted assembly sides, target fabricator and available standard stackups. Mark each input as confirmed, estimated or pending.
- With an enclosure drawing, derive the usable outline, mounting datum, holes, openings, connector positions and height on both sides. Check insertion, cable and tool access. Without a fixed envelope, estimate length and width by placing the actual footprints with room for routing, isolation, cooling, assembly and testing. Prefer standard processes and compare total cost before shrinking the outline.
- Choose finished thickness from connector fit, enclosure, supports and available fab builds. State tolerances on fit-critical dimensions such as card thickness, mounting-hole position or slot width. Use fab standard tolerances elsewhere. For assembled panels, check panel rails, tooling, depanelization method and tab or V-score locations with the assembler before fixing the outline and edge parts.

## Draw and test the floorplan

Place mechanical anchors first. Sketch the power input, protection, converters, loads, control, sensing and external interfaces. Mark critical forward and return paths, heat sources, cooling area, and parts that must be close or separated. Reserve access for power and ground probes, programming and reset where applicable. Apply interface-specific requirements such as impedance, isolation, ESD return paths and antenna keepouts when the circuit calls for them.

Prepare a dimensioned outline and placement sketch showing fixed coordinates, orientation and the proposed position of critical parts. Identify the tightest pin escape, widest power path and most demanding signal return. Check these against actual pads, clearances, selected widths and reference copper. If trial routing or mechanical fit is still unverified, label it pending and specify the check needed. Record the result of moving or rotating movable parts before proposing a more expensive build.

## Select layers and vias

Evaluate **two layers first, then four, then six**. Record the limiting net, pin escape, return path, spacing or mechanical constraint before proposing the next layer count. If a documented requirement already rules out a lower count, cite it. Give each proposed layer a copper role and identify the reference layer for critical signals.

Prefer full-stack plated through vias at every layer count. For blind or buried vias, the table lists the only eligible physical drill spans, numbered from the top copper layer.

| Copper layers | Preferred through span | Eligible blind or buried spans, subject to approval |
| --- | --- | --- |
| 2 | L1–L2 | None |
| 4 | L1–L4 | L1–L2 and L3–L4 (blind) |
| 6 | L1–L6 | L1–L2 and L5–L6 (blind), L3–L4 (buried) |

Inspect the via's physical start and end layers. For example, an L1–L6 through via may carry a signal between traces on L2 and L3. An L2–L3 blind or buried drill is prohibited, as are L4–L5 and every unlisted partial span. Verify that the selected fabricator supports the **entire proposed combination** on the specified stackup, including finished thickness, copper weights, hole and pad sizes. Record the fabricator and stackup ID or drawing revision.

When four layers with through vias cannot meet the constraints, compare **six layers with through vias** and **four layers with eligible blind vias** against the same bottleneck. Mark infeasible options with the reason. Compare fabrication and assembly costs and lead times at the same quantity. Prefer through vias when costs and schedules are comparable. If six layers with eligible via spans remain infeasible, stop and present the bottleneck and alternatives such as a larger outline, connector relocation or schematic footprint review.

## Obtain approval and record the baseline

For the initial proposal and every subsequent stage or change, present the recommendation, evidence, alternatives, cost and schedule impact. Mark unavailable prices or lead times as pending. Wait for explicit user approval before implementation, including changes within an approved stage. Obtain distinct decisions on layer count and via technology. A single response can approve both when it explicitly covers both.

Record the approval in the project's design notes against the revision and floorplan. Include board dimensions and shape, thickness and tolerances, stackup and copper weights, approved drill spans, placement, panel requirements, quantity and quote status. Use this record for fabrication handoff. Return fabricator substitutions or revised order terms to the user for approval before accepting them.

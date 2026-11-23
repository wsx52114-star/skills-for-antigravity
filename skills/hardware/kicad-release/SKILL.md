---
name: kicad-release
description: Run KiCad 10 CLI ERC/DRC and schematic-parity gates, audit JSON reports, clean dangling tracks/vias in a working copy, and export Gerber, drill, BOM, and POS manufacturing deliverables.
---

# KiCad Verification and Manufacturing Sign-Off

Applies across five project gates: schematic completion, post-PCB sync, routing completion, pre-release manufacturing sign-off, and hardware bring-up.

## 1. Five Sign-Off Checkpoints

| Gate | Required Verification |
| --- | --- |
| Schematic complete | Verify power, grounds, connector pinouts, file revisions, symbols/footprints, DNP, and BOM; run CLI ERC, fix all errors, and review warnings. |
| Post-PCB sync | Confirm expected part and net changes; run `--schematic-parity` for logical parity, then verify physical copper and zone connectivity on the PCB. |
| Routing complete | Refill zones after every modification; trial-delete unconnected/dangling items in an isolated working copy, run full DRC, and verify `kicad-pcb` routing rules (pad/via center terminations, zero pass-through/edge-only touches, zero dangling stubs or duplicate overlapping segments). |
| Pre-release | Require **0 ERC errors, 0 DRC errors, 0 unconnected items, and 0 parity mismatches**. Clear dangling objects, verify pad/via center terminations and zero undocumented geometry exceptions, and review every warning, exclusion, and ignored check. Record the rationale for each approved exception in the hardware design notes and enforce zero warnings when the project requires it. Export from the confirmed revision. |
| Hardware bring-up | Validate mechanical fit, voltage drop, temperature rise, signal integrity, isolation, and function under target loads and conditions. |

## 2. Cross-Platform KiCad 10 CLI Verification

Resolve `kicad-cli` from `PATH` first (Windows default fallback: `C:\Program Files\KiCad\10.0\bin\kicad-cli.exe`; macOS fallback: `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`). Write transient reports to the OS temp directory (`$env:TEMP` on Windows; `$TMPDIR` or `/tmp` on POSIX) using `--format json` for exact machine-readable counting:

```powershell
# PowerShell (on Linux/WSL/macOS, call `kicad-cli` directly with "$TMPDIR")
$cli = (Get-Command kicad-cli -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
if (-not $cli) { $cli = 'C:\Program Files\KiCad\10.0\bin\kicad-cli.exe' }

& $cli sch erc --severity-all --format json -o (Join-Path $env:TEMP 'erc.json') 'Board.kicad_sch'
& $cli pcb drc --all-track-errors --severity-all --schematic-parity --refill-zones --format json -o (Join-Path $env:TEMP 'drc.json') 'Board.kicad_pcb'
```

- **Saving refilled zones:** `--refill-zones` refills zones in memory during DRC. Only add `--save-board` (valid only alongside `--refill-zones`) after confirming target revision and backup.
- **Audit `erc.json`:** Verify zero errors across `sheets[].violations`; review every warning and `ignored_checks` entry and document approved exceptions.
- **Audit `drc.json`:** Verify zero error-level items across `violations`, `unconnected_items`, and `schematic_parity`, and audit remaining warnings and `ignored_checks`.

## 3. Unconnected Items and Dangling Object Cleanup

1. **Establish the baseline before removal.** Before deleting tracks or vias, run KiCad DRC on the unchanged revision with zone refill and schematic parity. Retain the baseline report separately from the candidate report. Use net names, pad numbers, and coordinates to locate candidate objects.
2. **Identify residual objects:** Look for vias reaching only one copper layer (dangling vias) or track segments terminated on only one end (dangling tracks) left behind by re-routing or zone edits.
3. **Trial-delete only in an isolated working copy:**
   - Use the backed-up, in-project working copy described in `kicad-pcb`. Identify the current-sharing and return-path functions before removing copper.
   - Trial-remove one related group at a time, refill zones, and re-run KiCad DRC (`--schematic-parity --refill-zones`). Compare unconnected items, violations and parity with the baseline, then inspect return paths and zone coverage before accepting the change.
   - If removal breaks a path or leaves copper islands, abort the deletion and re-route with adjacent tracks (or hand coordinates to `kicad-pcb` / KiCad GUI).

## 4. Manufacturing Export and Release Sign-Off

Once all four hard gates equal `0` and geometry/cross-document reviews pass, export Gerber, drill, BOM, and POS deliverables from the **same confirmed revision** into a versioned output folder (e.g., `manufacturing/<rev>/`). Confirm fab origin, units, and DNP rules before running exports:

```powershell
$out = 'manufacturing/rev-a'
New-Item -ItemType Directory -Force -Path $out | Out-Null

# 1. Gerbers (use stored board plot settings and check/refill zones; add --use-drill-file-origin / --subtract-soldermask per fab rules)
& $cli pcb export gerbers --board-plot-params --check-zones -o "$out/gerber/" 'Board.kicad_pcb'

# 2. Drill (align --drill-origin [absolute|plot] with Gerber/POS origin; add --excellon-separate-th if fab requires separate PTH/NPTH; verify every per-span .drl file when blind/buried vias are enabled)
& $cli pcb export drill --format excellon -u mm --drill-origin plot --generate-map --generate-report -o "$out/gerber/" 'Board.kicad_pcb'

# 3. POS pick-and-place (KiCad CLI defaults to ascii/inches; explicitly set csv, mm, drill-file origin, and DNP exclusion for SMT)
& $cli pcb export pos --format csv --units mm --use-drill-file-origin --exclude-dnp -o "$out/Board-pos.csv" 'Board.kicad_pcb'

# 4. BOM (add --fields, --group-by, or --preset as required by procurement)
& $cli sch export bom --exclude-dnp -o "$out/Board-bom.csv" 'Board.kicad_sch'
```

### Pre-Release Audit and Sign-Off Summary

For a new board, reconcile the approved hardware design notes with the KiCad stackup, fabrication drawing, outline, copper and drill outputs, and the fabricator's order settings. Invoke `kicad-pcb` to inspect each drill span against the approved subset in its `references/new-board-planning.md` rules. Confirm the stackup ID, finished thickness, copper weights, critical tolerances, panel requirements, quantity and quote revision. Keep unresolved differences pending and obtain user approval for any proposed substitution before fabrication.

Record the sign-off summary in the project's hardware design notes (using the same notes file as `kicad-pcb`, e.g., `DESIGN_NOTES.md` or `.agents/docs/hardware-design-notes.md`). Include the routing trade-offs identified before write-back (for example, the length increase on a named net or the reason a particular pad entry is off-center).
- **Target revision and checked files:** Production vs. prototype identity and `.kicad_sch`, `.kicad_pcb`, `.kicad_pro`, `.kicad_dru` paths.
- **Gate counts:** `ERC Errors`, `DRC Errors`, `Unconnected Items`, `Schematic Parity Issues` (all must be `0`), plus documented rationales for any retained warnings or `ignored_checks`.
- **Geometry and cross-document parity:** Confirmation of 90°/45° routing, pad/via center terminations (no edge-only touches, pass-through tracks, via-touching-pad without track, dangling stubs, or duplicate overlapping segments), uniform signal widths and power widths/vias, Kelvin sensing, split-ground/star-ground return continuity, zero unintended islands, fixed outline/mounting-hole/connector positions, HV spacing, consistent dimensions/thickness/copper/stackup across PCB/mechanical/fab specs, schematic-PCB-BOM-POS alignment for any low-voltage `0 Ω` jumpers or DNP edits, and documented rationales for any intentional exceptions (e.g., high-power pads, via arrays).
- **Exported deliverables:** Generated Gerber, drill, BOM, and POS paths with origin, unit, and DNP settings.

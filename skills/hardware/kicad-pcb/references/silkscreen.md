# Silkscreen Placement Rules

Apply these rules when placing, editing, scripting, or reviewing `F.Silkscreen` and `B.Silkscreen` text, polarity marks, and board markings.

## 1. What to Print

- **Reference designators for all soldered parts (including DNP):** Print a reference designator on silkscreen for every physically soldered component, including DNP parts.
- **Values and part numbers on Fab only:** Keep component values and part numbers (MPN) on `F.Fab` / `B.Fab`, off silkscreen.
- **Functional text for bare contacts and mechanical features:** Omit reference designators on bare contacts/terminals, test pads, mounting holes, and logos. Label contacts and test points with functional text instead (e.g., `W`, `V`, `U`, `SCL SDA`, `G T R 5`).
- **Visible polarity and orientation marks:** Place orientation markers outside the component body so they remain visible after assembly: IC pin-1 mark, diode cathode mark, and electrolytic capacitor `+` mark.
- **Board markings in clear space:** Place board name, revision, and date in open space, away from component placement zones.

## 2. Typography

- **Uniform reference designators:** Use a consistent board-wide font for reference designators: **height `0.6 mm`** (`0.6 × 0.6 mm`) and **stroke width `0.1 mm`** (stroke width ≈ `1/6` of height).
- **Selective enlargement:** Enlarge text only for special purposes, such as prominent components or pin/interface labels.
- **Fabricator minimums:** Confirm text height and stroke width against the target fabricator's minimums before ordering; stay at or above fab limits.

## 3. Placement

- **Same side as component:** Place top-component reference designators on `F.Silkscreen` and bottom-component reference designators on `B.Silkscreen`.
- **Tight outside the part:** Place each reference designator immediately outside its component in the nearest open spot, about **`0.1–0.5 mm`** from its pads or body.
- **Unambiguous ownership:** Keep each reference designator closer to its own component than to any neighbor; keep it clear of the midpoint between two adjacent parts.
- **Outside the component body:** Keep reference designators outside the component body footprint so assembly does not cover them. Allow placement underneath only for elevated/raised parts when no adjacent space exists.
- **Aligned dense groups:** Align reference designators neatly in rows or columns for groups of similar parts in dense areas.

## 4. Orientation

- **Two reading directions only:** Orient silkscreen text either **horizontally** (left-to-right, `0°`) or **vertically reading bottom-to-top**.
- **Side-specific vertical angles:**
  - `F.Silkscreen` vertical: **`90°`**.
  - `B.Silkscreen` vertical: **`270°`** (back-side text is mirrored, so `270°` reads bottom-to-top when viewed from the back).
- **Prohibited angles:** Prohibit upside-down text (`180°`) and top-to-bottom vertical reading (`270°` on `F.Silkscreen`, `90°` on `B.Silkscreen`).

## 5. Clearances

| Target | Minimum Clearance |
| --- | ---: |
| Pad / solder mask opening | `0.05 mm` (recommend `0.15 mm` when fab permits) |
| Other silkscreen (refdes, outlines) | `0.05 mm` |
| Board edge | `0.25 mm` |
| Via | Avoid where possible; tented vias are acceptable, untented (exposed) vias are prohibited |

## 6. Verification

- **Silk-to-silk DRC caveat (`min_silk_clearance`):** When `min_silk_clearance` in `.kicad_pro` is `0` (KiCad's default), KiCad DRC does not flag silkscreen-to-silkscreen collisions. Either set `min_silk_clearance` to `>= 0.05 mm` in `.kicad_pro` or run a script against the `.kicad_pcb` to verify silkscreen clearances.
- **Pre-export visual inspection:** Before generating manufacturing outputs, inspect both front and back sides—viewing the back side **mirrored** (as seen looking directly at the back of the board)—to confirm no text is obscured, clipped, or mirrored backwards.

---
name: taiwan-term
description: Audit and update Chinese terminology in repositories using a pinned Taiwan.md vocabulary snapshot and project glossary. Use when checking Traditional Chinese for Taiwan usage, identifying China-specific terms, normalizing user-facing domain language, applying context-aware wording fixes, or verifying that terminology-only edits did not change program behavior.
---

# Taiwan Terminology

Use the bundled, reviewed Taiwan.md snapshot so repeated scans are offline and reproducible. Treat matches as evidence to inspect, not permission for mechanical replacement.

## Workflow

1. Inspect the repository instructions, status, project glossary, tracked file types, generated files, vendor material, and historical records. Define exclusions before scanning.
2. Run the conservative scan from the repository root:

   ```bash
   python3 <skill-dir>/scripts/audit_terms.py --mode detection
   ```

   Add `--exclude '<glob>'` for generated, vendored, quoted-source, or historical paths. Pass explicit paths after `--` when the user limits scope.
3. For a check-and-modify request or whole-project audit, run `--mode full` and inspect all in-scope prose for wording the snapshot cannot detect. Treat full-mode results as review candidates; zero detection findings is not completion.
4. Classify scanner findings and unflagged prose using [references/review-policy.md](references/review-policy.md). Read `.agents/CONTEXT.md` and enforce its canonical and avoid terms across headings, tables, UI text, logs, tests, and documentation in scope.
5. When modification is authorized, normalize confirmed terminology and user-facing domain language. Preserve identifiers, protocols, API fields, filenames, commands, quotations, upstream text, and necessary product names. Prefer the smallest contextual rewrite that preserves meaning and tone.
6. Re-run the same scan, inspect the complete diff, and verify that only intended language changed. Run relevant tests when executable strings, fixtures, or source files changed.
7. Report the Taiwan.md revision from the scan output, fixed terms, retained exceptions, paths excluded, and residual review candidates. Commit or push only when explicitly requested.

## Scan modes

- `detection`: Use Taiwan.md opt-in severity A and B rules with upstream false-positive patterns. Start here.
- `full`: Search every normalized China-side term in the snapshot. Use for check-and-modify requests, whole-project audits, and human review; short and polysemous terms produce noise.

Use `--format json` for machine-readable evidence and `--fail-on a` for an opt-in CI gate. Keep severity B and full-mode findings informational.

## Snapshot contract

Read `references/taiwan-md/UPSTREAM.json` and `terminology.snapshot.json` locally. Do not fetch Taiwan.md during an audit. The independent synchronization workflow pins a full upstream commit, regenerates the snapshot, and proposes a review-only pull request.

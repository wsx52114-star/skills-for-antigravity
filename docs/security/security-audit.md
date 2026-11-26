# Security Audit

`security-audit` is a source-first security guidance and vulnerability review
skill synchronized from upstream
[`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill)
into `skills/security/security-audit/` (tracked by
`.github/security-audit-sync/upstream-lock.json` with upstream `LICENSE`
preserved). This summary document under `docs/security/` is project-owned.

## Operating Modes

- **Guidance mode (default)**: Answers security questions, performs focused
  reviews, or investigates specific findings without running all six phases or
  creating audit files.
- **Full audit mode**: Runs only on explicit requests for a full/comprehensive
  codebase audit, pen test, or report artifacts.

## Full Audit Workflow & Outputs

Full audit mode runs six phases (reconnaissance, coverage-led hunting waves,
candidate validation, structured output, independent record verification, and
target-neutral reporting) using nine domain companion guides (indexed in
`ATTACK-CLASSES.md`), selectable run profiles (`quick`, `standard`, `deep`),
strict agent-budget reserves, and OS-enforced sandbox execution controls.

By default, parent-only shared artifacts are written outside the target
repository at `~/security-audit-skill/<repo-name>/run-<N>`:

- `run-metadata.json`, `architecture.md`, `coverage-ledger.json`
- `findings.json` (validated with `report-schema.json`, `validate-findings.cjs`,
  and `validate-coverage-ledger.cjs`)
- `REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`

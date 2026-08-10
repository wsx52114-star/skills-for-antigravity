---
name: review
description: Run quality and risk gates before integration.
disable-model-invocation: true
---

# Review

Return an evidence-backed integration decision. Review is read-only unless the human separately requests fixes.

## Workflow

1. Fix the review base and enumerate the complete change set, approved specification and verification evidence.
2. Use `code-review` for Standards and Spec review. Add `security-audit` when exploitability is in scope, `security-and-hardening` when trust boundaries changed, and `code-simplification` when the implementation adds avoidable complexity.
3. Deduplicate findings by root cause. Rank actionable findings by impact and cite the smallest relevant location.
4. Verify that required tests, documentation, migration and rollback evidence exist. Keep uncertain findings explicitly uncertain.
5. Return `go`, `go with follow-up`, or `no-go`, with the blocking findings first. Recommend `/ship` only for a go decision.

## Completion

The complete change was reviewed against its specification and standards, risks are prioritized and the integration decision is explicit.

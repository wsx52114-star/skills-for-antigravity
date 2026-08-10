---
name: ship
description: Decide release readiness and prepare a safe rollout.
disable-model-invocation: true
---

# Ship

Prepare a release and return a go/no-go decision. Deployment requires separate explicit authorization.

## Workflow

1. Confirm an approved specification, completed plan, green evidence and a go review decision. Stop when any required gate is missing.
2. Use `ci-cd-and-automation` for pipeline gates, `observability-and-instrumentation` for production evidence, and `shipping-and-launch` for staged rollout and rollback readiness.
3. Define the release unit, compatibility and migration requirements, rollout stages, rollback trigger, owner and monitoring window. Use `wizard` when credentials or a third-party dashboard require human-only steps.
4. Present the exact deployment actions and ask for authorization. Treat production changes, releases, pushes, credentials and physical hardware operations as separate approvals.
5. After an authorized deployment, verify runtime health and record the release result. Otherwise finish with a readiness report only.

## Completion

Release readiness, rollout, rollback, observability and authorization state are explicit; no deployment occurred without approval.

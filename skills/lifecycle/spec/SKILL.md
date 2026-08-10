---
name: spec
description: Define and approve a specification before implementation.
disable-model-invocation: true
---

# Spec

Produce one approved specification. Do not implement it.

## Workflow

1. Read the project `AGENTS.md`, relevant context and ADRs, then inspect the existing behavior at the change seam. Finish when current constraints and affected callers are named.
2. Resolve material ambiguity. Use `grilling` for unresolved intent, `domain-modeling` for project language, and `api-and-interface-design` when a public interface changes. Finish when no implementation-changing question remains implicit.
3. Write the specification in the configured local tracker or `.scratch/`. Include objective, non-goals, observable behavior, interfaces, compatibility, failure modes, security, verification, rollout and open decisions. Obtain approval before publishing to an external tracker.
4. Present the proposed specification and stop for approval. Continue to `/planning` only after the specification is explicitly accepted.

## Completion

The specification has one authoritative location, testable acceptance criteria, no hidden decisions and explicit human approval.

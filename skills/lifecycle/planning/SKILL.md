---
name: planning
description: Turn an approved specification into an executable plan.
disable-model-invocation: true
---

# Planning

Turn one approved specification into ordered vertical slices. Do not implement them.

## Workflow

1. Locate the approved specification and verify its acceptance criteria. Stop if approval or a required decision is missing.
2. Reduce uncertainty before decomposition. Use `prototype` for a throwaway design question and `api-and-interface-design` for public interfaces. Finish when every remaining unknown can be resolved inside one slice.
3. Define the smallest end-to-end slices that produce observable evidence. Give each slice its dependencies, files or seams likely affected, acceptance criteria, verification and rollback notes.
4. Order slices by blocking edges and identify the next executable slice. If the human explicitly requests publication, hand off to `to-tickets`; use `wayfinder` only for work larger than one agent session.
5. Present the plan and stop for approval. Continue to `/build` only after the plan is explicitly accepted.

## Completion

The plan is approved, dependency-ordered, independently verifiable and has exactly one next executable slice.

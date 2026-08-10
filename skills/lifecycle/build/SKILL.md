---
name: build
description: Implement the next approved vertical slice with evidence.
disable-model-invocation: true
---

# Build

Implement one approved vertical slice. Preserve every authorization boundary.

## Workflow

1. Read project instructions, repository status, the approved plan and the next slice. Finish when the change seam, observable result and unrelated user changes are identified.
2. Choose the smallest relevant workflow: use `tdd` for behavior changes, `codebase-design` for a new or changed module interface, and `source-driven-development` when framework or library facts control the implementation.
3. Implement only the selected slice. Mock hardware interfaces by default and obtain permission before physical tests. Keep commits, pushes, releases and external writes behind their own explicit authorization.
4. Run the slice's checks and capture observable evidence. If an unexpected failure appears, switch to `diagnosing-bugs` before attempting speculative fixes.
5. Report the implemented behavior, evidence and remaining plan state. Recommend `/test`; do not silently start the next slice.

## Completion

The selected slice meets its acceptance criteria, relevant checks pass and no unrelated project state was changed.

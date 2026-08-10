# Addy agent-skills synchronization

This fork-owned control plane installs an allowlisted subset of
`addyosmani/agent-skills` under `skills/addyosmani-pack/`. The nested upstream
layout is preserved so each selected skill can resolve shared `references/`
without patching upstream prose.

`selection.json` is the adoption boundary. `upstream-lock.json` records the
exact source commit, selected skills and upstream inventory. Updates are
proposed through review-only pull requests and never add skills implicitly.

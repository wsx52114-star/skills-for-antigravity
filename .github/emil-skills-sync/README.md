# Emil skills synchronization

This fork-owned control plane imports `emilkowalski/skills/skills/*/` into
`skills/design/*/`. Each skill retains all its reference files and receives a
copy of the upstream MIT license so project-local copies preserve attribution.

The source skill `prototype` is installed as `ui-prototype` to keep the existing
engineering `prototype` available. Only its frontmatter name is changed; the
compatibility rule resolves references to that source skill. All other skill
text and invocation settings are preserved.

`upstream-lock.json` records the exact upstream commit and source inventory.
The category README belongs to this project and is preserved by the adapter.
The primary `mattpocock/skills` sync cannot replace the design category.

The shared [Sync All Skills](../workflows/sync-skills.yml) workflow checks weekly
and proposes updates using the existing `SYNC_PR_TOKEN`. Manual runs can select
`emil-skills` to check only this source. Every update requires human review. New or removed
skills require a corresponding root README inventory update before validation
can pass.

```sh
node .github/emil-skills-sync/apply-upstream-snapshot.mjs \
  --repo-root . --snapshot-root /path/to/snapshot --sha FULL_COMMIT_SHA
node --test .github/upstream-sync/tests/*.test.mjs
node .github/upstream-sync/validate.mjs
```

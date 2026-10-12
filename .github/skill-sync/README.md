# Shared skill synchronization

[`Sync All Skills`](../workflows/sync-skills.yml) is the only scheduled entry
point. It runs every Monday at 00:00 UTC (08:00 Asia/Taipei) and checks every
source registered in [`sources.json`](sources.json). Manual runs can select one
source or all sources at any time.

Each selected source calls [`sync-source.yml`](../workflows/sync-source.yml)
through a matrix. Jobs run independently with `fail-fast: false`. Per-source
concurrency queues scheduled and manual requests for the same source.

`Sync All Skills` is also the only manual synchronization entry point. In
Actions, select **Run workflow** and choose `all` or one source. The old
source-specific workflows have been removed.

## Source boundary

Each source keeps its own adapter, lock, snapshot selection, branch prefix,
and review-only PR. Shared code handles fetching, checking file types, skipping
unchanged commits, invoking the adapter, validating, and committing. The
primary upstream source retains its collision classifier and the distinction
between source content and generated index/lock changes.

Before invoking an adapter, the shared flow checks the existing root index
structure. After every adapter (including the Python terminology adapter),
[`indexes.mjs`](indexes.mjs) rebuilds the root README skill tables from the
installed `SKILL.md` paths and frontmatter. Additions, removals, renames,
category moves, and invocation changes travel in the same snapshot PR. New
categories receive a table. Existing summaries, local prose, and newline
style are preserved; new summaries use the first description sentence.

The primary commit step checks that README changes exactly match this
generated result and retain the original file mode before classifying source
content. Unrelated README edits fail rather than being exempted. Both the
index and lock are then included in the single snapshot commit. Existing
blocked-path classification remains in place.

Emil uses the same helper to plan its Design table and project-owned category
index before writing skills. Category READMEs owned by other upstreams remain
source content. Repository validation remains strict and lists missing and
extra runtime names when the root inventory differs.

Archive creation disables `core.autocrlf` for that command so checkout newline
preferences cannot convert source LF bytes to CRLF. Repository settings remain
unchanged.

The built-in `GITHUB_TOKEN` pushes the source branch. `SYNC_PR_TOKEN` is passed
only to the PR step. An unchanged source skips applying, testing, committing,
pushing, and the token-dependent PR call.

## Adding a source

1. Add its adapter, ownership boundary, and lock inventory validation.
2. Register its repository, paths, adapter, lock, and branch prefix in
   `sources.json`.
3. Add its ID to the unified workflow's manual choice list.
4. Run the regression suite and validate workflows with actionlint.

```sh
node .github/skill-sync/sync.mjs matrix --source all
node --test .github/upstream-sync/tests/*.test.mjs
node .github/upstream-sync/validate.mjs
```

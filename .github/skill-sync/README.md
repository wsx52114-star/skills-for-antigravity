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
between content and lock changes.

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

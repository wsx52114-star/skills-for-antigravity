# Upstream synchronization control plane

This directory is owned by the Antigravity fork and is not part of the Agent
runtime interface. It keeps the repository synchronized with the selected
parts of `mattpocock/skills`.

The repository itself is installed by cloning it directly to `~/.agents`.
Antigravity consumes the root `skills/` and `rules/` directories; no installer,
link, junction, or generated runtime manifest is involved.

## Local checks

```sh
node --test .github/upstream-sync/tests/*.test.mjs
node .github/upstream-sync/validate.mjs
```

`ownership.json` defines the upstream allowlist, fork-owned paths, and skills
that must not enter the direct runtime checkout. During composition, index
lines for excluded skills are removed from imported category READMEs.
`upstream-lock.json` records the source commit and composed file inventory.

The fork-owned `skills/security/security-audit/` subtree is managed separately
by [`.github/security-audit-sync/`](../security-audit-sync/) and is never
imported from `mattpocock/skills`.

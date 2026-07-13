# Cloudflare security-audit synchronization

This fork-owned control plane synchronizes
`cloudflare/security-audit-skill/skills/security-audit/` into
`skills/security/security-audit/`.

The upstream root `LICENSE` is installed beside the skill as
`skills/security/security-audit/LICENSE`. Every update is proposed through a
pull request and requires human review; executable upstream changes are never
auto-merged.

`upstream-lock.json` records the exact source commit and upstream inventory.

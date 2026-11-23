# Antigravity 2.0 Plugins

Domain-scoped Antigravity 2.0 plugins layered over `../skills/` via each plugin's `skills.json`, avoiding skill file duplication and preserving upstream sync paths and locks.

## Plugin Inventory

| Plugin | Default State | Mapped Skills | Scoped Rules |
| --- | --- | --- | --- |
| [`engineering-workflow`](./engineering-workflow/plugin.json) | Enabled | `skills/engineering/*` + `skills/productivity/*` (excluding `i-have-adhd`) (26) | [`rules/AGENTS.md`](./engineering-workflow/rules/AGENTS.md) |
| [`kicad-hardware`](./kicad-hardware/plugin.json) | Enabled | `skills/hardware/*` (3) | [`rules/AGENTS.md`](./kicad-hardware/rules/AGENTS.md) |
| [`taiwan-terminology`](./taiwan-terminology/plugin.json) | Enabled | `skills/language/*` (1) | — |
| [`frontend-design`](./frontend-design/plugin.json) | Disabled | `skills/design/*` (20) | [`rules/AGENTS.md`](./frontend-design/rules/AGENTS.md) |
| [`security-audit`](./security-audit/plugin.json) | Disabled | `skills/security/*` (1) | [`rules/AGENTS.md`](./security-audit/rules/AGENTS.md) |
| [`focus-adhd`](./focus-adhd/plugin.json) | Disabled | `skills/productivity/i-have-adhd` (1) | — |
| [`experimental-lab`](./experimental-lab/plugin.json) | Disabled | `skills/in-progress/*` + `skills/misc/*` (10) | — |

## Global Registration

Register this directory globally in `~/.gemini/config/plugins.json` using an **absolute path** (Antigravity's plugin loader does not expand `~/` inside `plugins.json`):

```json
{
  "entries": [
    {
      "path": "C:/Users/<user>/.agents/plugins"
    }
  ]
}
```

On Linux, WSL, or Raspberry Pi, use `/home/<user>/.agents/plugins`.

Toggle plugins on demand from the Antigravity Customizations UI or via CLI:

```bash
agy plugin list
agy plugin enable frontend-design
agy plugin disable kicad-hardware
```

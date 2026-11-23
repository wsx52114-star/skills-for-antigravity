# Antigravity 2.0 Plugins

Domain-scoped Antigravity 2.0 plugins aligned 1:1 with `../skills/<category>/` via each plugin's `skills.json`, avoiding skill file duplication and preserving upstream sync paths and locks.

## Plugin Inventory

| Plugin (`skills/<category>`) | Display Name | Default State | Mapped Skills | Scoped Rules |
| --- | --- | --- | --- | --- |
| [`software`](./software/plugin.json) | 軟體開發（Software） | Enabled | `skills/software/*` (19) | [`rules/AGENTS.md`](./software/rules/AGENTS.md) |
| [`hardware`](./hardware/plugin.json) | 硬體開發（Hardware） | Enabled | `skills/hardware/*` (3) | [`rules/AGENTS.md`](./hardware/rules/AGENTS.md) |
| [`productivity`](./productivity/plugin.json) | 通用協作與生產力（Productivity） | Enabled | `skills/productivity/*` (8) | — |
| [`language`](./language/plugin.json) | 台灣用語規範（Language） | Enabled | `skills/language/*` (1) | — |
| [`ui-design`](./ui-design/plugin.json) | Web 與介面設計（UI Design） | Disabled | `skills/ui-design/*` (20) | [`rules/AGENTS.md`](./ui-design/rules/AGENTS.md) |
| [`security`](./security/plugin.json) | 資安稽核（Security） | Disabled | `skills/security/*` (1) | [`rules/AGENTS.md`](./security/rules/AGENTS.md) |
| [`in-progress`](./in-progress/plugin.json) | 上游開發中（In Progress） | Disabled | `skills/in-progress/*` (7) | — |
| [`misc`](./misc/plugin.json) | 雜項工具（Misc） | Disabled | `skills/misc/*` (3) | — |

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

Toggle plugins on demand from the Antigravity **Customizations > Installed** UI or via CLI:

```bash
agy plugin list
agy plugin enable ui-design
agy plugin disable hardware
```

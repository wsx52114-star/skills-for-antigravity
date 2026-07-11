# Security Audit

`security-audit` is the Antigravity fork's security review workflow. It combines
reconnaissance, attack-class hunting, memory-safety guidance, validation, and a
machine-checkable findings schema.

Invoke it when you want to find exploitable vulnerabilities or perform a
security review. The workflow prioritizes demonstrated impact over theoretical
concerns and produces `REPORT.md`, `FINDINGS-DETAIL.md`, and `findings.json`.

The skill is located at `skills/security/security-audit/` so upstream skill
updates can be imported without editing or relocating this fork-owned module.

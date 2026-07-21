# Skills for Antigravity

An Antigravity distribution of agent skills adapted from `mattpocock/skills`. It provides shared engineering workflows while keeping each project's language and decisions local to that project.

## Language

### Work tracking

**Issue tracker**:
The system that hosts a repository's issues, such as GitHub Issues, Linear, or a local Markdown convention.
_Avoid_: backlog manager, backlog backend, issue host

**Issue**:
A single tracked unit of work inside an **Issue tracker**, such as a bug, task, spec, or slice produced by `to-tickets`.
_Avoid_: ticket, except when quoting an external system

**Triage role**:
A canonical state-machine label applied to an **Issue** during triage, such as `needs-triage` or `ready-for-afk`.
_Avoid_: status, stage

### Skill distribution

**Agent home**:
The centrally managed source repository linked into selected workspaces to provide shared **Runtime skills** and **Compatibility rules**.
_Avoid_: native Antigravity global scope, global project context, runtime repo

**Runtime skill**:
A skill included in this distribution and available for Antigravity to invoke.
_Avoid_: active skill, installed command

**Upstream snapshot**:
The selected state of one upstream commit imported without its Git history.
_Avoid_: upstream merge, vendored repository

**Fork-owned path**:
Content maintained only by this project and never replaced by an **Upstream snapshot**.
_Avoid_: local override, patched upstream file

**Compatibility rule**:
A rule that translates platform-specific skill behavior for Antigravity without modifying the upstream skill text.
_Avoid_: patched skill, forked workflow

### Project knowledge

**Project context**:
The domain language and relationships that belong to one development project.
_Avoid_: Agent home context, global context

**Skill documentation**:
Reference material that explains how a shared skill works.
_Avoid_: project documentation, project ADR

**Project documentation**:
Context, ADRs, specs, and other knowledge that belongs to one development project.
_Avoid_: skill documentation, global documentation

## Relationships

- An **Agent home** contains many **Runtime skills** and **Compatibility rules**.
- An **Upstream snapshot** supplies eligible skills and **Skill documentation**, but never replaces a **Fork-owned path**.
- A **Runtime skill** may read or create **Project documentation** using the current **Project context**.
- An **Issue tracker** holds many **Issues**.
- An **Issue** carries one **Triage role** at a time.

## Flagged ambiguities

- “context” means **Project context** unless this repository's glossary is explicitly named.
- “docs” must be qualified as **Skill documentation** or **Project documentation**.
- “backlog” is not the system hosting work; that system is the **Issue tracker**.
- “active skill” is replaced by **Runtime skill** because inclusion in the distribution is the relevant distinction.

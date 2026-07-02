#!/usr/bin/env python3
import os
import subprocess
import sys

UPSTREAM_URL = "https://github.com/mattpocock/skills.git"
REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_command(cmd, cwd=REPO_DIR):
    try:
        result = subprocess.run(cmd, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return result.stdout.strip(), None
    except subprocess.CalledProcessError as e:
        return e.stdout.strip() if e.stdout else "", e.stderr.strip() if e.stderr else str(e)

def setup_upstream():
    print("Checking git remote configurations...")
    stdout, _ = run_command("git remote")
    remotes = stdout.splitlines()
    
    if "upstream" not in remotes:
        print(f"Adding upstream remote: {UPSTREAM_URL}")
        _, err = run_command(f"git remote add upstream {UPSTREAM_URL}")
        if err:
            print(f"Error adding upstream: {err}")
            return False
    return True

def sync_git():
    print("Fetching and merging changes from upstream/main...")
    _, err = run_command("git fetch upstream")
    if err:
        print(f"Error fetching from upstream: {err}")
        return False
        
    stdout, err = run_command("git merge upstream/main -m \"Merge upstream changes\"")
    if err:
        print(f"Merge encountered issues (possibly conflicts): {err}")
        print("Will attempt to apply Antigravity adaptations first, but you may need to resolve conflicts manually.")
    else:
        print("Upstream changes merged successfully.")
    return True

def apply_antigravity_adaptations():
    print("Applying Antigravity-specific adaptations...")
    
    # 1. Update CONTEXT.md
    context_path = os.path.join(REPO_DIR, "CONTEXT.md")
    if os.path.exists(context_path):
        with open(context_path, "r", encoding="utf-8") as f:
            content = f.read()
        target = "A collection of agent skills (slash commands and behaviors) loaded by Claude Code. Skills are organized into buckets and consumed by per-repo configuration emitted by `/setup-matt-pocock-skills`."
        replacement = "A collection of agent skills (slash commands and behaviors) loaded by Antigravity. Skills are organized into buckets and consumed by per-repo configuration emitted by `setup-antigravity-skills`."
        if target in content:
            content = content.replace(target, replacement)
            with open(context_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            print("✓ Updated CONTEXT.md")
            
    # 2. Update README.md
    readme_path = os.path.join(REPO_DIR, "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()
        target = "| `git-guardrails-claude-code` | 設定 Claude Code hooks，攔截危險 git 指令。 |"
        replacement = "| `git-guardrails-claude-code` | 設定 Antigravity 規則限制，攔截危險 git 指令。 |"
        if target in content:
            content = content.replace(target, replacement)
            with open(readme_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            print("✓ Updated README.md")

    # 3. Update docs/engineering/setup-matt-pocock-skills.md
    doc_path = os.path.join(REPO_DIR, "docs", "engineering", "setup-matt-pocock-skills.md")
    if os.path.exists(doc_path):
        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        t1 = "plus an `## Agent skills` block pointing to them in whichever of `CLAUDE.md` / `AGENTS.md` the repo already uses."
        r1 = "plus an `## Agent skills` block pointing to them in the repo's `.agents/AGENTS.md`."
        t2 = "- Three files land under `docs/agents/`, and an `## Agent skills` section appears in your `CLAUDE.md` or `AGENTS.md`."
        r2 = "- Three files land under `docs/agents/`, and an `## Agent skills` section appears in your `.agents/AGENTS.md`."
        
        updated = False
        if t1 in content:
            content = content.replace(t1, r1)
            updated = True
        if t2 in content:
            content = content.replace(t2, r2)
            updated = True
            
        if updated:
            with open(doc_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            print("✓ Updated setup-matt-pocock-skills doc")

    # 4. Update scripts/link-skills.sh
    link_path = os.path.join(REPO_DIR, "scripts", "link-skills.sh")
    if os.path.exists(link_path):
        with open(link_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        t1 = '#   - ~/.claude/skills  — Claude Code\n#   - ~/.agents/skills  — pi and other Agent-Skills-standard harnesses'
        r1 = '#   - ~/.gemini/config/skills  — Antigravity Customizations\n#   - ~/.agents/skills         — Project local Agent Skills'
        t2 = 'DESTS=("$HOME/.claude/skills" "$HOME/.agents/skills")'
        r2 = 'DESTS=("$HOME/.gemini/config/skills" "$HOME/.agents/skills")'
        
        updated = False
        if t1 in content:
            content = content.replace(t1, r1)
            updated = True
        if t2 in content:
            content = content.replace(t2, r2)
            updated = True
            
        if updated:
            with open(link_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            print("✓ Updated scripts/link-skills.sh")

    # 5. Update rules/skills.md
    skills_rules_path = os.path.join(REPO_DIR, "rules", "skills.md")
    if os.path.exists(skills_rules_path):
        with open(skills_rules_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        t1 = "| `git-guardrails-claude-code` | Block dangerous git commands in Claude Code. |"
        r1 = "| `git-guardrails-claude-code` | Block dangerous git commands via Antigravity rules. |"
        if t1 in content:
            content = content.replace(t1, r1)
            
        adaptation_layer = """
## Agent Harness & Platform Adaptation Layer

When loading and executing skills from the `.agents/skills/` directory, you MUST dynamically adapt and translate any Claude Code specific configurations or references to Antigravity's environment. Follow these translation rules strictly:

1. **Rule File Mapping (`CLAUDE.md` ➔ `AGENTS.md`)**:
   - If a skill (e.g., `setup-matt-pocock-skills`) instructs you to explore, create, or update `CLAUDE.md`, you MUST redirect the operations to **`.agents/AGENTS.md`** instead. Do NOT create or edit `CLAUDE.md` in the repository root.

2. **Git Guardrail Translation**:
   - When encountering `git-guardrails-claude-code`, do NOT attempt to write hooks to `.claude/settings.json` or create `PreToolUse` bash configurations.
   - Instead, translate the action to writing Git restriction guidelines directly into **`.agents/AGENTS.md`** under a `## Git Safety Rules` section, ensuring the agent model limits itself.

3. **Slash Command Execution**:
   - If documentation or comments refer to slash commands (e.g., `/setup-matt-pocock-skills`, `/triage`), they are mapped to natural language keywords (e.g., "setup-matt-pocock-skills", "triage") in Antigravity.
"""
        if "## Agent Harness & Platform Adaptation Layer" not in content:
            content = content.strip() + "\n" + adaptation_layer
            
        with open(skills_rules_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
        print("✓ Updated rules/skills.md (added/verified Adaptation Layer)")

def main():
    if not setup_upstream():
        sys.exit(1)
    
    # Check git status first to avoid losing uncommitted changes
    stdout, _ = run_command("git status --porcelain")
    if stdout:
        print("Warning: You have uncommitted changes. Please commit or stash them before syncing.")
        sys.exit(1)
        
    if sync_git():
        apply_antigravity_adaptations()
        print("\nSync and Antigravity adaptation completed successfully!")
    else:
        print("\nSync failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()

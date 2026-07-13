#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SKILLS_REPO="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
PROJECT_ROOT="$(pwd -P)"
AGENTS_DIR="$PROJECT_ROOT/.agents"

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

check_directory_slot() {
  local path="$1"
  if [[ -L "$path" ]]; then
    fail "Expected a project-local directory but found a symlink: $path"
  fi
  if [[ -e "$path" && ! -d "$path" ]]; then
    fail "Expected a directory but found another file type: $path"
  fi
}

check_file_slot() {
  local path="$1"
  if [[ -L "$path" ]]; then
    fail "Expected a project-local file but found a symlink: $path"
  fi
  if [[ -e "$path" && ! -f "$path" ]]; then
    fail "Expected a regular file but found another file type: $path"
  fi
}

check_link_slot() {
  local source="$1"
  local destination="$2"

  if [[ -L "$destination" ]]; then
    local actual
    actual="$(readlink -f -- "$destination" || true)"
    if [[ "$actual" != "$source" ]]; then
      fail "Existing symlink points to '$actual'; expected '$source': $destination"
    fi
    return
  fi

  if [[ -e "$destination" ]]; then
    fail "Refusing to replace an existing file or directory: $destination"
  fi
}

ensure_link() {
  local source="$1"
  local destination="$2"

  if [[ -L "$destination" ]]; then
    printf 'Unchanged: %s\n' "$destination"
    return
  fi

  ln -s -- "$source" "$destination"
  printf 'Linked: %s -> %s\n' "$destination" "$source"
}

write_if_missing() {
  local path="$1"
  local content="$2"

  if [[ -f "$path" ]]; then
    printf 'Unchanged: %s\n' "$path"
    return
  fi

  printf '%s\n' "$content" > "$path"
  printf 'Created: %s\n' "$path"
}

[[ -d "$SKILLS_REPO/skills" ]] || fail "Skills directory not found: $SKILLS_REPO/skills"
[[ -f "$SKILLS_REPO/rules/skills.md" ]] || fail "Rules file not found: $SKILLS_REPO/rules/skills.md"
[[ "$PROJECT_ROOT" != "$SKILLS_REPO" ]] || fail "Run this script from a development project, not from the Agent home."

# Preflight every destination before creating or changing anything.
check_directory_slot "$AGENTS_DIR"
check_directory_slot "$AGENTS_DIR/docs"
check_directory_slot "$AGENTS_DIR/docs/adr"
check_file_slot "$AGENTS_DIR/AGENTS.md"
check_file_slot "$AGENTS_DIR/CONTEXT.md"
check_file_slot "$AGENTS_DIR/.gitignore"
check_link_slot "$SKILLS_REPO/skills" "$AGENTS_DIR/skills"
check_link_slot "$SKILLS_REPO/rules" "$AGENTS_DIR/rules"

mkdir -p -- "$AGENTS_DIR/docs/adr"

write_if_missing "$AGENTS_DIR/AGENTS.md" '# Project Agent Instructions

Before non-trivial work:

1. Read `.agents/rules/skills.md`.
2. Read `.agents/CONTEXT.md` when domain language matters.
3. Read relevant decisions under `.agents/docs/adr/`.
4. Keep project knowledge inside this project.'

write_if_missing "$AGENTS_DIR/CONTEXT.md" '# Project Context

Project-specific domain language and relationships belong here.'

write_if_missing "$AGENTS_DIR/.gitignore" '# Machine-local shared Agent home links
/skills
/rules'

ensure_link "$SKILLS_REPO/skills" "$AGENTS_DIR/skills"
ensure_link "$SKILLS_REPO/rules" "$AGENTS_DIR/rules"

if git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 &&
   git -C "$PROJECT_ROOT" check-ignore -q --no-index -- .agents/CONTEXT.md; then
  printf 'Warning: .agents/CONTEXT.md is ignored by the project Git rules; adjust .gitignore to track project knowledge.\n' >&2
fi

printf 'Agent project initialization complete.\n'

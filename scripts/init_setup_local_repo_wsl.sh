#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SKILLS_REPO="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
PROJECT_ROOT="$(pwd -P)"
AGENTS_DIR="$PROJECT_ROOT/.agents"
SKILLS_DIR="$AGENTS_DIR/skills"

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

declare -A SKILL_SOURCES=()
while IFS= read -r -d '' skill_file; do
  skill_source="$(dirname -- "$skill_file")"
  skill_name="$(basename -- "$skill_source")"
  if [[ -n "${SKILL_SOURCES[$skill_name]+present}" ]]; then
    fail "Duplicate skill name '$skill_name': ${SKILL_SOURCES[$skill_name]} and $skill_source"
  fi
  SKILL_SOURCES["$skill_name"]="$skill_source"
done < <(find "$SKILLS_REPO/skills" -type f -name SKILL.md -print0 | sort -z)

[[ ${#SKILL_SOURCES[@]} -gt 0 ]] || fail "No skills found under: $SKILLS_REPO/skills"

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
check_file_slot "$AGENTS_DIR/CONTEXT.md"
check_file_slot "$AGENTS_DIR/.gitignore"
check_link_slot "$SKILLS_REPO/rules" "$AGENTS_DIR/rules"

legacy_skills_link=false
if [[ -L "$SKILLS_DIR" ]]; then
  actual="$(readlink -f -- "$SKILLS_DIR" || true)"
  [[ "$actual" == "$SKILLS_REPO/skills" ]] || \
    fail "Existing symlink points to '$actual'; expected '$SKILLS_REPO/skills': $SKILLS_DIR"
  legacy_skills_link=true
elif [[ -e "$SKILLS_DIR" && ! -d "$SKILLS_DIR" ]]; then
  fail "Expected a directory but found another file type: $SKILLS_DIR"
fi

if [[ "$legacy_skills_link" == false ]]; then
  for skill_name in "${!SKILL_SOURCES[@]}"; do
    check_link_slot "${SKILL_SOURCES[$skill_name]}" "$SKILLS_DIR/$skill_name"
  done
fi

mkdir -p -- "$AGENTS_DIR/docs/adr"

write_if_missing "$AGENTS_DIR/CONTEXT.md" '# Project Context

Project-specific domain language and relationships belong here.'

write_if_missing "$AGENTS_DIR/.gitignore" '# Machine-local shared Agent home links
/skills
/rules'

if [[ "$legacy_skills_link" == true ]]; then
  rm -- "$SKILLS_DIR"
  mkdir -p -- "$SKILLS_DIR"
  printf 'Migrated: %s from whole-directory link to flat skill links\n' "$SKILLS_DIR"
else
  mkdir -p -- "$SKILLS_DIR"
fi

while IFS= read -r skill_name; do
  ensure_link "${SKILL_SOURCES[$skill_name]}" "$SKILLS_DIR/$skill_name"
done < <(printf '%s\n' "${!SKILL_SOURCES[@]}" | sort)

ensure_link "$SKILLS_REPO/rules" "$AGENTS_DIR/rules"

if git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 &&
   git -C "$PROJECT_ROOT" check-ignore -q --no-index -- .agents/CONTEXT.md; then
  printf 'Warning: .agents/CONTEXT.md is ignored by the project Git rules; adjust .gitignore to track project knowledge.\n' >&2
fi

printf 'Agent project initialization complete.\n'

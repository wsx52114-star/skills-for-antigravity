#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SKILLS_REPO="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
PROJECT_ROOT="$(pwd -P)"
AGENTS_DIR="$PROJECT_ROOT/.agents"
SKILLS_DIR="$AGENTS_DIR/skills"
INSTALL_STATE="$AGENTS_DIR/.install-state"

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

ACTION="--sync"
CHANNEL="all"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check|--sync|--uninstall) ACTION="$1"; shift ;;
    --channel)
      [[ $# -ge 2 ]] || fail "--channel requires 'stable' or 'all'"
      CHANNEL="$2"
      shift 2
      ;;
    *) printf 'Usage: %s [--check|--sync|--uninstall] [--channel stable|all]\n' "$0" >&2; exit 1 ;;
  esac
done
[[ "$CHANNEL" == "stable" || "$CHANNEL" == "all" ]] || { printf 'Error: --channel requires stable or all\n' >&2; exit 1; }

drift=false
declare -a REPLACE_LINKS=()
declare -a STALE_LINKS=()

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
      if is_managed_skill_link "$destination"; then
        printf 'Outdated: %s -> %s\n' "$destination" "$actual"
        REPLACE_LINKS+=("$destination")
        drift=true
        return
      fi
      fail "Existing symlink points to '$actual'; expected '$source': $destination"
    fi
    return
  fi

  if [[ -e "$destination" ]]; then
    fail "Refusing to replace an existing file or directory: $destination"
  fi

  printf 'Missing: %s\n' "$destination"
  drift=true
}

is_managed_skill_link() {
  local destination="$1"
  local target
  [[ -L "$destination" ]] || return 1
  target="$(readlink -- "$destination")"
  [[ "$target" == /* ]] || target="$(dirname -- "$destination")/$target"
  target="$(realpath -m -- "$target")"
  [[ "$target" == "$SKILLS_REPO/skills/"* ]]
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
  if [[ "$CHANNEL" == "stable" && "$skill_source" == "$SKILLS_REPO/skills/in-progress/"* ]]; then
    continue
  fi
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

render_install_state() {
  printf 'version=1\nmode=link\nchannel=%s\nsource=%s\n' "$CHANNEL" "$SKILLS_REPO"
  printf 'skill=%s\n' "${!SKILL_SOURCES[@]}" | sort
}

ensure_line() {
  local path="$1"
  local line="$2"
  has_ignore_line "$path" "$line" || printf '%s\n' "$line" >> "$path"
}

has_ignore_line() {
  [[ -f "$1" ]] && awk -v rule="$2" '
    $0 == rule { positive = NR }
    /^[[:space:]]*!/ { negative = NR }
    END { exit !(positive > negative) }
  ' "$1"
}

[[ -d "$SKILLS_REPO/skills" ]] || fail "Skills directory not found: $SKILLS_REPO/skills"
[[ -f "$SKILLS_REPO/rules/skills.md" ]] || fail "Rules file not found: $SKILLS_REPO/rules/skills.md"
[[ "$PROJECT_ROOT" != "$SKILLS_REPO" ]] || fail "Run this script from a development project, not from the Agent home."

check_directory_slot "$AGENTS_DIR"
check_file_slot "$INSTALL_STATE"

if [[ "$ACTION" == "--uninstall" ]]; then
  check_directory_slot "$SKILLS_DIR"
  if [[ -d "$SKILLS_DIR" ]]; then
    while IFS= read -r -d '' destination; do
      if is_managed_skill_link "$destination"; then
        rm -- "$destination"
        printf 'Removed: %s\n' "$destination"
      fi
    done < <(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type l -print0)
  fi
  if [[ -L "$AGENTS_DIR/rules" && "$(readlink -f -- "$AGENTS_DIR/rules" || true)" == "$SKILLS_REPO/rules" ]]; then
    rm -- "$AGENTS_DIR/rules"
    printf 'Removed: %s\n' "$AGENTS_DIR/rules"
  fi
  rm -f -- "$INSTALL_STATE"
  printf 'Agent project uninstall complete. Project-local knowledge was preserved.\n'
  exit 0
fi

# Preflight every destination before creating or changing anything.
check_directory_slot "$AGENTS_DIR"
check_directory_slot "$AGENTS_DIR/docs"
check_directory_slot "$AGENTS_DIR/docs/adr"
check_file_slot "$AGENTS_DIR/CONTEXT.md"
check_file_slot "$AGENTS_DIR/.gitignore"
check_file_slot "$INSTALL_STATE.tmp"
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

  if [[ -d "$SKILLS_DIR" ]]; then
    while IFS= read -r -d '' destination; do
      skill_name="$(basename -- "$destination")"
      if [[ -z "${SKILL_SOURCES[$skill_name]+present}" ]] && is_managed_skill_link "$destination"; then
        printf 'Stale: %s\n' "$destination"
        STALE_LINKS+=("$destination")
        drift=true
      fi
    done < <(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type l -print0)
  fi
else
  printf 'Outdated: %s uses the legacy whole-directory link\n' "$SKILLS_DIR"
  drift=true
fi

for required_ignore in /skills /rules /.install-state; do
  if ! has_ignore_line "$AGENTS_DIR/.gitignore" "$required_ignore"; then
    printf 'Missing: %s entry %s\n' "$AGENTS_DIR/.gitignore" "$required_ignore"
    drift=true
  fi
done

if [[ ! -f "$INSTALL_STATE" || "$(cat -- "$INSTALL_STATE")" != "$(render_install_state)" ]]; then
  printf 'Outdated: %s\n' "$INSTALL_STATE"
  drift=true
fi

if [[ "$ACTION" == "--check" ]]; then
  if [[ "$drift" == true ]]; then
    printf 'Agent project installation has drift.\n'
    exit 2
  fi
  printf 'Agent project installation is current.\n'
  exit 0
fi

mkdir -p -- "$AGENTS_DIR/docs/adr"

write_if_missing "$AGENTS_DIR/CONTEXT.md" '# Project Context

Project-specific domain language and relationships belong here.'

write_if_missing "$AGENTS_DIR/.gitignore" '# Machine-local shared Agent home links
/skills
/rules
/.install-state'

ensure_line "$AGENTS_DIR/.gitignore" /skills
ensure_line "$AGENTS_DIR/.gitignore" /rules
ensure_line "$AGENTS_DIR/.gitignore" /.install-state

if [[ "$legacy_skills_link" == true ]]; then
  rm -- "$SKILLS_DIR"
  mkdir -p -- "$SKILLS_DIR"
  printf 'Migrated: %s from whole-directory link to flat skill links\n' "$SKILLS_DIR"
else
  mkdir -p -- "$SKILLS_DIR"
fi

for destination in "${REPLACE_LINKS[@]}" "${STALE_LINKS[@]}"; do
  [[ -n "$destination" ]] || continue
  rm -- "$destination"
  printf 'Removed: %s\n' "$destination"
done

while IFS= read -r skill_name; do
  ensure_link "${SKILL_SOURCES[$skill_name]}" "$SKILLS_DIR/$skill_name"
done < <(printf '%s\n' "${!SKILL_SOURCES[@]}" | sort)

ensure_link "$SKILLS_REPO/rules" "$AGENTS_DIR/rules"
render_install_state > "$INSTALL_STATE.tmp"
mv -- "$INSTALL_STATE.tmp" "$INSTALL_STATE"

if git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 &&
   git -C "$PROJECT_ROOT" check-ignore -q --no-index -- .agents/CONTEXT.md; then
  printf 'Warning: .agents/CONTEXT.md is ignored by the project Git rules; adjust .gitignore to track project knowledge.\n' >&2
fi

printf 'Agent project initialization complete.\n'

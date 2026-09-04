#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_CLI_PACKAGE="skills@1.5.17"
skill_count=0
failures=0

strip_ansi() {
  sed $'s/\033\\[[0-9;?]*[ -\\/]*[@-~]//g'
}

while IFS= read -r -d '' skill_file; do
  skill_count=$((skill_count + 1))
  skill_dir="$(dirname -- "$skill_file")"
  relative_dir="${skill_dir#"$REPO_DIR"/}"

  if output="$(npx --yes "$SKILLS_CLI_PACKAGE" add "$skill_dir" --list </dev/null 2>&1)"; then
    printf 'Validated %s\n' "$relative_dir"
  else
    printf 'Invalid skill: %s\n%s\n' "$relative_dir" "$output" >&2
    failures=$((failures + 1))
  fi
done < <(find "$REPO_DIR" -type f -name SKILL.md \
  -not -path '*/.git/*' -not -path '*/node_modules/*' -print0)

if [ "$skill_count" -eq 0 ]; then
  printf 'No SKILL.md files found.\n' >&2
  exit 1
fi

if output="$(npx --yes "$SKILLS_CLI_PACKAGE" add "$REPO_DIR" --list </dev/null 2>&1)"; then
  plain_output="$(printf '%s\n' "$output" | strip_ansi)"
  if ! printf '%s\n' "$plain_output" | grep -Fq "Found $skill_count skill"; then
    printf 'Whole-repository discovery did not find all %s skills.\n%s\n' \
      "$skill_count" "$output" >&2
    failures=$((failures + 1))
  fi
else
  printf 'Whole-repository discovery failed.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

if [ "$failures" -ne 0 ]; then
  printf '%s skill validation check(s) failed.\n' "$failures" >&2
  exit 1
fi

for test_script in "$REPO_DIR"/tests/*.sh; do
  [ -e "$test_script" ] || continue
  /bin/bash "$test_script"
done

printf 'All %s skills are discoverable with %s.\n' "$skill_count" "$SKILLS_CLI_PACKAGE"

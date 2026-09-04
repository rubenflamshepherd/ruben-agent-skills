#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL="$REPO_DIR/session-discovery/SKILL.md"

test -f "$SKILL"
grep -Fqx 'name: session-discovery' "$SKILL"

for expected in \
  '~/.claude/projects/**/*.jsonl' \
  '~/.claude/history.jsonl' \
  '~/.codex/sessions/**/*.jsonl' \
  '~/.codex/archived_sessions/**/*.jsonl' \
  '~/.pi/agent/sessions/**/*.jsonl' \
  'rg -i -l' \
  'internal timestamps' \
  'parent transcript path' \
  'automatically prepare a resume command' \
  'changes to the original working directory and resumes the selected session' \
  '`vamos` for Claude Code' \
  '`letsgo` for Codex' \
  '`pi` for Pi' \
  '`pbcopy`'; do
  if ! grep -Fq "$expected" "$SKILL"; then
    printf 'Session-discovery skill is missing required guidance: %s\n' "$expected" >&2
    exit 1
  fi
done

printf 'Session-discovery skill tests passed.\n'

#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_PATH=".githooks"
HOOK_FILE="$REPO_DIR/$HOOKS_PATH/pre-commit"

if ! git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf 'Error: %s is not a Git working tree.\n' "$REPO_DIR" >&2
  exit 1
fi

if [ ! -x "$HOOK_FILE" ]; then
  printf 'Error: pre-commit hook is missing or not executable: %s\n' "$HOOK_FILE" >&2
  exit 1
fi

existing_hooks_path="$(git -C "$REPO_DIR" config --local --get core.hooksPath 2>/dev/null || true)"
if [ -n "$existing_hooks_path" ] && [ "$existing_hooks_path" != "$HOOKS_PATH" ]; then
  printf 'Error: this clone already uses core.hooksPath=%s.\n' "$existing_hooks_path" >&2
  printf 'Remove that local setting before installing these hooks.\n' >&2
  exit 1
fi

git -C "$REPO_DIR" config --local core.hooksPath "$HOOKS_PATH"

configured_hooks_path="$(git -C "$REPO_DIR" config --local --get core.hooksPath)"
if [ "$configured_hooks_path" != "$HOOKS_PATH" ]; then
  printf 'Error: failed to configure the repository hooks path.\n' >&2
  exit 1
fi

printf 'Installed repository hooks from %s.\n' "$HOOK_FILE"

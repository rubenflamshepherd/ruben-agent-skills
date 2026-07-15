# Ruben Agent Skills

Personal Codex skills for shipping changes and cleaning up Git branches.

## Skills

### `checkout-commit-push-pr`

Runs the complete Git shipping workflow: creates a branch when needed, commits the current changes, pushes them, opens a pull request, and monitors CI until the required checks pass.

### `soft-delete-git`

Safely cleans up a merged local branch. It updates the default branch and uses Git's non-forcing `branch -d` behavior, with an explicit safeguard for squash-merged pull requests.

### `ship-it`

Orchestrates the other two skills as one workflow:

1. Run `checkout-commit-push-pr`.
2. Wait for the pull request to be merged.
3. Run `soft-delete-git` for the shipped branch.

The `ship-it`, `checkout-commit-push-pr`, and `soft-delete-git` directories must remain siblings so the orchestrator can resolve its dependencies.

## Installation

Copy the skill directories into your Codex skills directory:

```bash
cp -R checkout-commit-push-pr soft-delete-git ship-it "${CODEX_HOME:-$HOME/.codex}/skills/"
```

## Validation

Every pull request and push to `main` runs `scripts/validate-skills.sh`. The validator checks each skill directory independently with pinned `skills@1.5.17`, then confirms whole-repository discovery finds the same number of skills. This prevents one malformed skill from being silently omitted while the rest of the repository still passes discovery.

# Ruben Agent Skills

Personal agent skills for shipping changes, cleaning up Git branches, naming devices, maintaining creative systems, and automating project infrastructure.

## Skills

### `add-google-analytics`

Plans, provisions, installs, verifies, and non-destructively repairs production GA4 for Next.js, static/Vite, and Flask/Jinja sites. It uses a keyless Google Cloud service account, keeps personal defaults outside repositories, and stores only non-secret GA resource state with each project.

### `checkout-commit-push-pr`

Runs the complete Git shipping workflow: creates a branch when needed, commits the current changes, pushes them, opens a pull request, and monitors CI until the required checks pass.

### `cultureship`

Develops original Culture-inspired names for computers and other devices by defining the machine’s personality, relationship with its user, emotional logic, and speaking voice before curating practical candidates.

### `image-style-creator`

Develops a new reusable image house style through guided inspiration curation, style hypotheses, two canonical anchors, a range stress test, and a repository-ready production skill with an archived development record.

### `quiet-impossibility`

Creates and evaluates tactile conceptual editorial images in Ruben's established Quiet Impossibility house style. It packages the canonical visual anchors, the full style specification, production prompts, quality gates, and responsive Notion-cover guidance.

### `soft-delete-git`

Safely cleans up a merged local branch. It updates the default branch and uses Git's non-forcing `branch -d` behavior, with an explicit safeguard for squash-merged pull requests.

### `ship-it`

Orchestrates the other two skills as one workflow:

1. Run `checkout-commit-push-pr`.
2. Merge the pull request after its required checks pass.
3. Run `soft-delete-git` for the shipped branch.

The `ship-it`, `checkout-commit-push-pr`, and `soft-delete-git` directories must remain siblings so the orchestrator can resolve its dependencies.

## Installation

Install selected skills globally with the Skills CLI. For example:

```bash
npx skills add rubenflamshepherd/ruben-agent-skills \
  --global \
  --agent pi codex claude-code \
  --skill add-google-analytics \
  --yes
```

## Validation

Every pull request and push to `main` runs `scripts/validate-skills.sh`. The validator checks each skill directory independently with pinned `skills@1.5.17`, then confirms whole-repository discovery finds the same number of skills. This prevents one malformed skill from being silently omitted while the rest of the repository still passes discovery.

Install the same validation as this clone's pre-commit hook with:

```bash
./scripts/install-hooks.sh
```

The helper sets this repository's local `core.hooksPath` to `.githooks`; it does not change other repositories or global Git configuration. Each commit then runs the shared validator before Git records it. The hook can be bypassed locally with `git commit --no-verify`, so CI remains the required backstop.

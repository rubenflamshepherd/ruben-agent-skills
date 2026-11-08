---
name: soft-delete-git
description: Safely soft-delete a merged Git branch by updating the default branch and running `git branch -d`, removing the branch's linked worktree first when there is one. Use when the user wants to clean up, remove, or delete a local branch or worktree after merging, or says "soft delete this branch" / "delete my branch". Escalates to the user instead of force-deleting if the branch is unmerged, except squash-merged PRs verified via `gh`.
---

# Soft Delete Git Branch Workflow

## Invocation behavior

When this skill is invoked without an explicit branch name, target the currently checked-out branch. Invocation of the skill is authorization to begin the workflow immediately: inspect the working tree and determine the current branch without asking which branch to delete.

Only ask the user how to proceed when:
- The working tree is dirty.
- The current branch is the default branch.
- Safe deletion fails and force deletion would require confirmation.

Do not ask the user to name or confirm the current branch before starting.

## Steps:

1. **Check for uncommitted changes**
   ```bash
   git status --porcelain
   ```
   If the working tree is dirty, stop and ask the user how to proceed (commit, stash, or discard) before continuing.

2. **Get current branch name**
   ```bash
   git branch --show-current
   ```
   If already on the default branch, there is no branch to delete — stop and ask the user which branch they meant.

3. **Determine the default branch**
   ```bash
   git symbolic-ref --short refs/remotes/origin/HEAD
   ```
   This returns e.g. `origin/main` — the default branch is the part after `origin/`. If the ref is unset, fall back to `main`.

4. **Determine whether you are in a linked worktree**
   ```bash
   git rev-parse --git-common-dir
   ```
   In the primary checkout this prints `.git`. In a linked worktree it prints a path ending in `.git` that lives inside the primary checkout; the primary checkout is that path's parent directory. Record the current worktree path from `git rev-parse --show-toplevel`.

5. **Update the default branch**

   In the primary checkout:
   ```bash
   git checkout <default-branch>
   git pull
   ```

   In a linked worktree, do not check out the default branch here; it is normally checked out in the primary checkout and Git refuses to check it out twice. Instead, run the same two commands from the primary checkout:
   ```bash
   git -C <primary-checkout> checkout <default-branch>
   git -C <primary-checkout> pull
   ```
   If the primary checkout has a dirty working tree or is on another branch with work in progress, stop and ask the user before touching it.

6. **Remove the linked worktree**

   Skip this step in the primary checkout. In a linked worktree, follow any repository guidance for tearing down the worktree's local services or data first (for example stopping a local preview), then remove it from the primary checkout:
   ```bash
   git -C <primary-checkout> worktree remove <worktree-path>
   ```
   Never pass `--force`; a refusal means the worktree holds untracked or modified files, so stop and ask the user. Your shell's working directory no longer exists after this step, so run the remaining commands with `git -C <primary-checkout>`.

7. **Soft delete the previous branch**
   ```bash
   git -C <primary-checkout> branch -d <branch-name>
   ```

8. **If soft delete fails, check for a squash merge**

   `git branch -d` fails for branches merged via GitHub's "Squash and merge", because the branch tip is never an ancestor of the default branch. Check whether the branch's PR was actually merged:
   ```bash
   gh pr view <branch-name> --json state,mergedAt
   ```
   - If the PR state is `MERGED`, confirm with the user, then delete with `git branch -D <branch-name>`.
   - Otherwise, escalate to the user rather than force-deleting.

## Notes:
- Uses lowercase `-d` for soft delete (safe delete that prevents deletion of unmerged branches)
- Never use uppercase `-D` (hard delete) except in the verified-squash-merge case above, and only after confirming with the user
- Never use `git worktree remove --force`; an unexpected refusal is a signal to involve the user
- The workflow ensures the default branch is up to date before attempting the delete

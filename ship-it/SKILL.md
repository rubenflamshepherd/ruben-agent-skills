---
name: ship-it
description: Run the sibling checkout-commit-push-pr and soft-delete-git skills in sequence to ship current changes through a pull request and then safely remove the merged local branch. Use when the user says "ship it" or asks to commit, push, open a PR, monitor CI, and clean up the branch as one end-to-end workflow.
---

# Ship It

Coordinate the two sibling skills without replacing or weakening either skill's instructions.

## Workflow

1. Resolve these paths relative to this skill's directory:

   - `../checkout-commit-push-pr/SKILL.md`
   - `../soft-delete-git/SKILL.md`

   Stop and report the missing dependency if either file is unavailable.

2. Record the current branch name so the same branch can be cleaned up later.

3. Read `../checkout-commit-push-pr/SKILL.md` completely and follow it through PR creation and CI monitoring. Preserve all of its safety checks and stop conditions. Capture the resulting PR URL or number.

4. Do not begin branch cleanup until that PR is merged. Check its state with `gh pr view`. This orchestrator does not grant permission to merge the PR. If it remains open after CI passes, report that cleanup is pending and resume after the PR is merged.

5. Once the PR is merged, read `../soft-delete-git/SKILL.md` completely and follow it for the branch recorded in step 2. Preserve its dirty-worktree checks and safe-delete behavior; never force-delete merely to complete this workflow.

6. Finish by reporting the PR URL, CI result, merge state, and whether the local branch was deleted.

If either child skill stops or fails, stop the sequence at that point and surface its exact blocker. Do not skip ahead or duplicate the child skill's procedure from memory.

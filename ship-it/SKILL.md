---
name: ship-it
description: Run the sibling checkout-commit-push-pr and soft-delete-git skills in sequence, merge the resulting green pull request, and safely remove the merged local branch. Use when the user says "ship it" or asks to commit, push, open, validate, merge, and clean up a pull request as one autonomous end-to-end workflow.
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

4. Treat the `ship-it` invocation as authorization to merge only the PR created by this run. After every required check passes, merge it with `gh pr merge`:

   - Follow a merge strategy required by repository guidance when one is documented.
   - Otherwise prefer `--merge`, because retaining branch ancestry allows the subsequent safe delete to use `git branch -d`.
   - If merge commits are explicitly disabled, fall back to an allowed strategy, preferring `--squash` and then `--rebase`. Do not change strategy merely because the PR has conflicts, lacks approval, or is blocked by policy.
   - Do not pass `--delete-branch`; leave local branch cleanup to `soft-delete-git`.
   - Never use `--admin` or bypass branch protection. Surface any review, conflict, permission, or policy blocker.

5. Verify the merge rather than trusting the merge command's exit status:

   ```bash
   gh pr view <PR-NUMBER> --json state,mergedAt,url
   ```

   If the repository uses a merge queue, monitor until the PR reports `MERGED`. Do not begin branch cleanup while it remains open.

6. Once the exact PR reports `MERGED`, read `../soft-delete-git/SKILL.md` completely and follow it for the branch recorded in step 2. Preserve its dirty-worktree and merged-PR verification safeguards. For a verified squash or rebase merge, treat the original `ship-it` request as advance confirmation for the child skill's `git branch -D` exception, but only for that recorded branch and exact merged PR. Never force-delete an unmerged or different branch.

7. Finish by reporting the PR URL, CI result, merge result, and whether the local branch was deleted.

If either child skill stops or fails, stop the sequence at that point and surface its exact blocker. Do not skip ahead or duplicate the child skill's procedure from memory.

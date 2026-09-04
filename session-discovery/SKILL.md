---
name: session-discovery
description: Find, inspect, recover, identify, or resume earlier coding-agent sessions across Claude Code, Codex, and Pi histories. Use whenever the user asks to locate previous work or continue an earlier agent conversation, regardless of the currently running harness.
---

# Session Discovery

Search every supported harness even when the current conversation is running in only one of them.

## Transcript locations

- **Claude Code**
  - Project transcripts: `~/.claude/projects/**/*.jsonl`
  - Prompt index: `~/.claude/history.jsonl`
  - Delegated work: nested `<parent-session-id>/subagents/*.jsonl`
- **Codex**
  - Active transcripts: `~/.codex/sessions/**/*.jsonl`
  - Archived transcripts, when present: `~/.codex/archived_sessions/**/*.jsonl`
- **Pi**
  - Transcripts: `~/.pi/agent/sessions/**/*.jsonl`
  - Directories are grouped by slugified working directory; each filename contains the start timestamp and session ID.

Treat these as defaults, not proof that no other store exists. Respect harness-specific environment overrides when present, and inspect the installed harness configuration if a default directory is missing.

## Search workflow

1. Extract several distinctive clues from the request: repository or project names, user wording and likely voice-transcription variants, file paths, endpoint names, technologies, commit hashes, and commit-message language.
2. If a repository is identifiable, inspect its Git log and reflog first. Commit dates, changed paths, and commit messages often narrow a broad transcript search and help distinguish initial implementation from later review or repair work.
3. Search all transcript roots case-insensitively. Start with `rg -i -l` so only candidate filenames enter context; include `~/.claude/history.jsonl` for a fast mapping from Claude Code prompts to session IDs. Use multiple narrower searches rather than one over-specific expression.
4. Inspect candidate JSONL files with targeted `jq` projections. Search user and assistant text, tool-call arguments, delegated-task prompts, file writes, command inputs, and subagent transcripts. Do not print whole JSONL lines merely to inspect one field: tool results and model reasoning can make a single line enormous.
5. Validate candidates against internal timestamps and session metadata. Do not rely on file modification time: resuming a session updates an old transcript, and a long-lived session can span multiple dates.
6. Establish whether the match contains the original work or only references it. Strong evidence includes the user's initiating request, tool calls that created the relevant files, the matching Git commit, and a completion report describing the implementation.
7. Rank the remaining candidates and report uncertainty instead of silently choosing the first keyword match.

For very large histories, narrow by harness, repository, filename start date, or Git-derived date before reading content.

## Harness-specific interpretation

### Claude Code

A parent transcript is normally `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`. Claude Code can delegate the actual implementation to `<encoded-cwd>/<parent-session-id>/subagents/<agent-id>.jsonl`. When the best evidence is in a subagent, report both paths and identify the parent session as the resumable conversation. `~/.claude/history.jsonl` is an index of user-entered prompts, project paths, and session IDs, not a complete transcript.

Compaction or continuation can leave closely related files containing overlapping context. Prefer the session whose internal records and Git timing show that it performed the original work.

### Codex

Codex rollout files are grouped beneath year/month/day directories. Read the `session_meta` record for the authoritative session ID, original `cwd`, and source. Subagents may have separate rollout files; use their metadata to relate them to the parent when possible. Search active and archived roots, and avoid counting function-call output records as separate actions when using tool activity as evidence.

### Pi

Read the opening `session` record for the authoritative ID, start time, and `cwd`. A Pi transcript is a tree linked by entry IDs and `parentId`; it can retain abandoned branches after a fork. A text or tool-call hit on an abandoned branch is still evidence that the discussion happened, but disclose the branch ambiguity when it affects confidence. Parallel tool calls appear as multiple `toolCall` parts in one assistant message.

## Result format

For each strong candidate, provide:

- harness;
- local date and time;
- original working directory;
- session ID;
- parent transcript path;
- relevant subagent path, if any;
- concise matching evidence;
- whether it is the original implementation or a later review, repair, deployment, or follow-up session;
- confidence or remaining ambiguity.

Lead with the strongest match. List plausible alternatives only when useful.

## Resuming a session

After identifying a strong candidate with enough confidence to recommend it, automatically prepare a resume command unless the user explicitly says not to. Do not wait for a separate request. If multiple candidates remain genuinely ambiguous, report that ambiguity instead of choosing one and wait for the user to select it.

1. Recover the original working directory from session metadata rather than guessing from the current shell.
2. Verify the installed harness's current resume syntax.
3. Prepare one shell command that changes to the original working directory and resumes the selected session.
4. Use the configured alias so expected permission and sleep-prevention behavior is preserved: `vamos` for Claude Code, `letsgo` for Codex, and `pi` for Pi. Do not spell out underlying permission-bypass flags separately.
5. Copy the command to the macOS clipboard with `pbcopy` and tell the user it is ready to paste; do not print the shell command in the response.

Typical command shapes are `vamos --resume <session-id>`, `letsgo resume <session-id>`, and `pi --session <transcript-path>`, but installed CLI help is authoritative.

## Privacy

Session histories can contain credentials, private prompts, email content, and large tool results. Expose only the evidence needed to identify the session. Never reproduce tokens, secrets, unrelated private conversation content, or sensitive tool output.

---
name: save-session-resume
description: Save the current Codex, Claude Code, or Pi conversation for later by recording a concise summary and exact resume command in ~/projects/session-resumes.md and on the macOS clipboard. Use when asked to bookmark, store, or save an agent session for resumption.
---

# Save a resumable session

1. Use the `session-discovery` skill to identify the **parent conversation**, its authoritative session ID or transcript path, original working directory, and harness. For a current session, an environment-provided ID is a clue; verify it against transcript metadata. Do not use a subagent transcript or a `--last` selector when an exact session is available. If the match is ambiguous, resolve it before saving.
2. Summarize the work in one short line: what was completed and the main remaining work or constraint. Do not include secrets or unrelated private transcript content.
3. Verify the installed harness's resume syntax and the configured launch alias. Build one shell command that enters the saved working directory and resumes the exact session. Use `letsgo` for Codex, `vamos` for Claude Code, or `pi` for Pi when those aliases are configured. If the user requested dangerous permissions, confirm the alias supplies them; do not assume or add bypass flags by guesswork. Shell-quote the directory and any transcript path. Do not execute the resume command.
4. Run [scripts/save_session_resume.py](scripts/save_session_resume.py) with `--session-id`, `--title`, `--summary`, and `--command`. It appends or refreshes one dated entry in `~/projects/session-resumes.md`, preserves other entries, and copies a shell-safe summary comment followed by the command to the clipboard. Resolve the script path relative to this `SKILL.md`. Use `--index` only when the user chose another shared file.
5. Confirm the script completed and link the index file. Tell the user the two-line clipboard text is ready to paste. Do not print the shell command in the response.

Honor narrower requests: if the user asks for only a file or only clipboard text, provide only that output. Keep the shared file at one entry per session; do not create dated per-session notes unless asked.

#!/usr/bin/env python3
"""Record one resumable session in a shared Markdown index and the clipboard."""

import argparse
import subprocess
from datetime import date
from pathlib import Path


def one_line(value, label):
    value = value.strip()
    if not value or "\n" in value or "\r" in value:
        raise ValueError(f"{label} must be one non-empty line")
    return value


def clipboard_text(summary, command):
    summary = one_line(summary, "summary").lstrip("# ")
    command = one_line(command, "command")
    return f"# {summary}\n{command}\n"


def save_entry(index, session_id, title, summary, command, entry_date):
    session_id = one_line(session_id, "session ID")
    title = one_line(title, "title")
    summary = one_line(summary, "summary")
    command = one_line(command, "command")
    entry_date = one_line(entry_date, "date")
    if "```" in command:
        raise ValueError("command cannot contain a Markdown code fence")

    entry = (
        f"## {entry_date} — {title}\n"
        f"<!-- session-id: {session_id} -->\n\n"
        f"{summary}\n\n"
        f"```sh\n{command}\n```"
    )
    existing = index.read_text() if index.exists() else "# Session resumes\n"
    starts = [
        offset for offset, line in enumerate(existing.splitlines(keepends=True))
        if line.startswith("## ")
    ]
    # Convert line indexes to character offsets so sections can be replaced intact.
    lines = existing.splitlines(keepends=True)
    offsets = [sum(len(line) for line in lines[:start]) for start in starts]
    for position, start in enumerate(offsets):
        end = offsets[position + 1] if position + 1 < len(offsets) else len(existing)
        if session_id in existing[start:end]:
            before = existing[:start].rstrip()
            after = existing[end:].lstrip("\n")
            content = before + "\n\n" + entry + "\n"
            if after:
                content += "\n" + after
            break
    else:
        content = existing.rstrip() + "\n\n" + entry + "\n"

    if not index.parent.is_dir():
        raise FileNotFoundError(f"Index directory does not exist: {index.parent}")
    index.write_text(content)
    if index.read_text() != content:
        raise RuntimeError(f"Could not verify saved entry: {index}")
    return index


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--command", required=True)
    parser.add_argument("--date", default=date.today().isoformat())
    parser.add_argument("--index", type=Path, default=Path.home() / "projects/session-resumes.md")
    args = parser.parse_args(argv)

    index = save_entry(
        args.index, args.session_id, args.title, args.summary, args.command, args.date
    )
    expected = clipboard_text(args.summary, args.command)
    subprocess.run(["pbcopy"], input=expected, text=True, check=True)
    actual = subprocess.run(["pbpaste"], capture_output=True, text=True, check=True).stdout
    if actual != expected:
        raise RuntimeError("Clipboard contents did not match the saved resume text")
    print(index)


if __name__ == "__main__":
    main()

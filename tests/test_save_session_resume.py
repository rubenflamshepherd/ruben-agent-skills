import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / "save-session-resume/scripts/save_session_resume.py"


def load_script():
    spec = importlib.util.spec_from_file_location("save_session_resume", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SaveSessionResumeTests(unittest.TestCase):
    def test_appends_entry_and_preserves_existing_sessions(self):
        module = load_script()
        with tempfile.TemporaryDirectory() as directory:
            index = Path(directory) / "session-resumes.md"
            index.write_text("# Session resumes\n\n## Earlier session\n\nKeep this note.\n")
            module.save_entry(
                index, "session-123", "Disk review", "Reviewed 47 disks.",
                "cd '/tmp/project' && letsgo resume session-123", "2026-09-28",
            )
            content = index.read_text()
            self.assertIn("## Earlier session\n\nKeep this note.", content)
            self.assertIn("## 2026-09-28 — Disk review", content)
            self.assertIn("<!-- session-id: session-123 -->", content)
            self.assertIn("```sh\ncd '/tmp/project' && letsgo resume session-123\n```", content)

    def test_replaces_existing_session_without_duplicate(self):
        module = load_script()
        with tempfile.TemporaryDirectory() as directory:
            index = Path(directory) / "session-resumes.md"
            index.write_text(
                "# Session resumes\n\n## Old disk title\n\nOld summary.\n\n"
                "```sh\ncd /tmp && letsgo resume session-123\n```\n\n"
                "## Other session\n\nKeep this.\n"
            )
            module.save_entry(
                index, "session-123", "Disk review", "Updated summary.",
                "cd '/tmp/project' && letsgo resume session-123", "2026-09-28",
            )
            content = index.read_text()
            self.assertEqual(content.count("session-123"), 2)  # marker and command
            self.assertNotIn("Old summary.", content)
            self.assertIn("## Other session\n\nKeep this.", content)
            self.assertIn("Updated summary.", content)

    def test_clipboard_contains_shell_safe_summary_then_command(self):
        module = load_script()
        self.assertEqual(
            module.clipboard_text("Reviewed 47 disks.", "cd '/tmp/project' && letsgo resume session-123"),
            "# Reviewed 47 disks.\ncd '/tmp/project' && letsgo resume session-123\n",
        )

    def test_cli_writes_index_and_verifies_clipboard(self):
        module = load_script()
        with tempfile.TemporaryDirectory() as directory:
            index = Path(directory) / "session-resumes.md"
            expected = "# Reviewed 47 disks.\ncd '/tmp/project' && letsgo resume session-123\n"
            with mock.patch.object(module.subprocess, "run") as run:
                run.side_effect = [
                    mock.Mock(returncode=0),
                    mock.Mock(returncode=0, stdout=expected),
                ]
                module.main([
                    "--index", str(index), "--session-id", "session-123",
                    "--date", "2026-09-28", "--title", "Disk review",
                    "--summary", "Reviewed 47 disks.",
                    "--command", "cd '/tmp/project' && letsgo resume session-123",
                ])
            self.assertTrue(index.exists())
            self.assertEqual(run.call_args_list[0].args[0], ["pbcopy"])
            self.assertEqual(run.call_args_list[0].kwargs["input"], expected)
            self.assertEqual(run.call_args_list[1].args[0], ["pbpaste"])


if __name__ == "__main__":
    unittest.main()

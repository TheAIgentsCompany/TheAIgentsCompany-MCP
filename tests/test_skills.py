"""Tests for the skills data access layer."""

from __future__ import annotations

from pathlib import Path

from theaigentscompany_mcp.skills import list_skills


class TestListSkills:
    def test_list_skills(self, test_skills_dir: Path) -> None:
        skills = list_skills(test_skills_dir)
        assert len(skills) >= 1
        dev = next(s for s in skills if "dev" in s["name"].lower())
        assert "TDD" in dev["description"]
        # Only name + description — no path or other fields
        assert set(dev.keys()) == {"name", "description"}

    def test_empty_dir(self, empty_dir: Path) -> None:
        skills = list_skills(empty_dir)
        assert skills == []

    def test_nonexistent_dir(self) -> None:
        skills = list_skills(Path("/nonexistent/path"))
        assert skills == []

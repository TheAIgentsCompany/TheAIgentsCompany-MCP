"""Tests for the projects data access layer."""

from __future__ import annotations

from pathlib import Path

from theaigentscompany_mcp.projects import get_project, list_projects


class TestListProjects:
    def test_list_all(self, test_projects_dir: Path) -> None:
        projects = list_projects(test_projects_dir)
        assert len(projects) == 2
        names = [p["name"] for p in projects]
        assert "Company Website" in names
        assert "Project Tracker MCP" in names

    def test_safe_fields_only(self, test_projects_dir: Path) -> None:
        """Public-safe output: no architecture_notes, tasks, key_decisions."""
        projects = list_projects(test_projects_dir)
        for p in projects:
            assert "architecture_notes" not in p
            assert "tasks" not in p
            assert "key_decisions" not in p
            assert "body_preview" not in p
            # Should have these
            assert "id" in p
            assert "name" in p
            assert "status" in p
            assert "goal" in p
            assert "repo" in p

    def test_empty_dir(self, empty_dir: Path) -> None:
        projects = list_projects(empty_dir)
        assert projects == []

    def test_nonexistent_dir(self) -> None:
        projects = list_projects(Path("/nonexistent/path"))
        assert projects == []


class TestGetProject:
    def test_by_filename(self, test_projects_dir: Path) -> None:
        p = get_project(test_projects_dir, "website")
        assert p is not None
        assert p["name"] == "Company Website"
        assert p["repo"] == "https://github.com/TheAIgentsCompany/website"

    def test_missing_project(self, test_projects_dir: Path) -> None:
        p = get_project(test_projects_dir, "nonexistent")
        assert p is None

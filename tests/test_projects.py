"""Tests for the projects data access layer."""

from __future__ import annotations

from pathlib import Path

from theaigents_tracker.projects import (
    get_project,
    list_projects,
    parse_project_file,
    search_projects,
)


class TestParseProjectFile:
    def test_valid_project(self, test_projects_dir: Path) -> None:
        """Basic parsing of a valid project file."""
        p = parse_project_file(test_projects_dir / "website.md")
        assert p is not None
        assert p.id == "website"
        assert p.name == "Company Website"
        assert p.status == "active"
        assert "landing page" in p.goal
        assert p.repo == "https://github.com/TheAIgentsCompany/website"
        assert p.private is True
        assert len(p.key_decisions) == 2
        assert len(p.tasks) == 2

    def test_missing_file(self, tmp_path: Path) -> None:
        """None for a non-existent file."""
        p = parse_project_file(tmp_path / "nonexistent.md")
        assert p is None

    def test_no_frontmatter(self, tmp_path: Path) -> None:
        """None when file has no YAML frontmatter."""
        f = tmp_path / "plain.md"
        f.write_text("# Just a markdown file\nNo frontmatter here.")
        p = parse_project_file(f)
        assert p is None

    def test_partial_frontmatter(self, tmp_path: Path) -> None:
        """Sensible defaults for minimal frontmatter."""
        f = tmp_path / "minimal.md"
        f.write_text("---\nid: minimal\n---\nBody text")
        p = parse_project_file(f)
        assert p is not None
        assert p.id == "minimal"
        assert p.status == "unknown"  # default
        assert p.goal == ""  # default
        assert p.body_preview == "Body text"

    def test_long_body_truncated(self, tmp_path: Path) -> None:
        """Body preview truncated to 300 chars."""
        body = "X" * 500
        f = tmp_path / "long.md"
        f.write_text(f"---\nid: long\nname: Long\n---\n{body}")
        p = parse_project_file(f)
        assert p is not None
        assert p.body_preview.endswith("...")
        assert len(p.body_preview) == 303  # 300 + "..."

    def test_invalid_yaml(self, tmp_path: Path) -> None:
        """None for invalid YAML content."""
        f = tmp_path / "bad.md"
        f.write_text("---\ninvalid: [unclosed\n---\nBody")
        p = parse_project_file(f)
        assert p is None


class TestListProjects:
    def test_list_all(self, test_projects_dir: Path) -> None:
        projects = list_projects(test_projects_dir)
        assert len(projects) == 2
        names = [p.name for p in projects]
        assert "Company Website" in names
        assert "Project Tracker MCP" in names

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
        assert p.name == "Company Website"

    def test_missing_project(self, test_projects_dir: Path) -> None:
        p = get_project(test_projects_dir, "nonexistent")
        assert p is None


class TestSearchProjects:
    def test_search_found(self, test_projects_dir: Path) -> None:
        results = search_projects(test_projects_dir, "landing")
        assert len(results) == 1
        assert results[0].name == "Company Website"

    def test_search_case_insensitive(self, test_projects_dir: Path) -> None:
        results = search_projects(test_projects_dir, "WEBSITE")
        assert len(results) == 1

    def test_search_no_match(self, test_projects_dir: Path) -> None:
        results = search_projects(test_projects_dir, "zzzznotfound")
        assert results == []

    def test_search_all(self, test_projects_dir: Path) -> None:
        results = search_projects(test_projects_dir, "mcp")
        assert len(results) == 1

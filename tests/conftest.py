"""Test fixtures for theaigents_tracker tests."""

from __future__ import annotations

from pathlib import Path

import pytest


@pytest.fixture
def test_projects_dir(tmp_path: Path) -> Path:
    """Create a temporary directory with sample project .md files."""
    d = tmp_path / "projects"
    d.mkdir(parents=True)

    # Active project
    (d / "website.md").write_text(
        """\
---
id: website
name: Company Website
status: active
goal: Build the company landing page and marketing site
repo: https://github.com/TheAIgentsCompany/website
private: true
key_decisions:
  - Static site with Hugo
  - Deploy on Vercel
architecture_notes: Hugo-based static site, no backend
tasks:
  - Design homepage
  - Build with Hugo
---
# Company Website

The main marketing site for TheAIgentsCompany.
"""
    )

    # Completed project
    (d / "project-tracker-mcp.md").write_text(
        """\
---
id: project-tracker-mcp
name: Project Tracker MCP
status: active
goal: An MCP server for company project data
repo: https://github.com/TheAIgentsCompany/project-tracker-mcp
private: true
architecture_notes: Python MCP server
---
Implementation details...
"""
    )

    return d


@pytest.fixture
def test_skills_dir(tmp_path: Path) -> Path:
    """Create a temporary directory with sample skill files."""
    d = tmp_path / "skills"
    d.mkdir(parents=True)

    skill_dir = d / "theaigents-dev"
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        """\
---
name: theaigents-dev
description: Engineering Lead — implements code with TDD
---
# Dev Skill
Implementation details...
"""
    )

    return d


@pytest.fixture
def empty_dir(tmp_path: Path) -> Path:
    """Return an empty temporary directory."""
    d = tmp_path / "empty"
    d.mkdir()
    return d

"""Minimal project data — public-safe output only."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger("theaigentscompany_mcp.projects")


def list_projects(projects_dir: Path) -> list[dict[str, Any]]:
    """List all projects with name, status, goal (brief), and repo link."""
    if not projects_dir.exists():
        return []

    projects: list[dict[str, Any]] = []
    for f in sorted(projects_dir.glob("*.md")):
        p = _parse_safe(f)
        if p:
            projects.append(p)
    return projects


def get_project(projects_dir: Path, project_id: str) -> dict[str, Any] | None:
    """Get a single project's public info by ID."""
    # Exact match
    fp = projects_dir / f"{project_id}.md"
    p = _parse_safe(fp)
    if p:
        return p
    # Fallback: search frontmatter id
    for f in projects_dir.glob("*.md"):
        p = _parse_safe(f)
        if p and p["id"] == project_id:
            return p
    return None


def _parse_safe(filepath: Path) -> dict[str, Any] | None:
    """Parse a project file, returning ONLY public-safe fields.

    Never exposes: architecture_notes, key_decisions, tasks, body_preview.
    """
    if not filepath.exists():
        return None
    try:
        text = filepath.read_text(encoding="utf-8")
    except OSError:
        return None

    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None

    try:
        raw: dict[str, Any] = yaml.safe_load(parts[1].strip()) or {}
    except yaml.YAMLError:
        return None
    if not isinstance(raw, dict):
        return None

    return {
        "id": str(raw.get("id", filepath.stem)),
        "name": str(raw.get("name", filepath.stem.replace("-", " ").title())),
        "status": str(raw.get("status", "unknown")),
        "goal": str(raw.get("goal", "")),
        "repo": str(raw.get("repo", "")),
    }

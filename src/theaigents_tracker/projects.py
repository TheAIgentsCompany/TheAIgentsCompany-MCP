"""Project data access layer.

Reads and parses project tracker markdown files from TheAIgentsCompany
infra repo using proper YAML frontmatter parsing.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import yaml

from .models import ProjectModel

logger = logging.getLogger("theaigents_tracker.projects")

# Regex to detect YAML frontmatter delimiters
_FM_DELIM = "---"


def parse_project_file(filepath: Path) -> ProjectModel | None:
    """Parse a single project .md file into a typed ProjectModel.

    Handles:
    - Missing or unreadable files gracefully
    - Invalid YAML frontmatter
    - Missing required fields with sensible defaults
    """
    if not filepath.exists():
        logger.debug("File not found: %s", filepath)
        return None

    try:
        text = filepath.read_text(encoding="utf-8")
    except OSError as e:
        logger.error("Failed to read %s: %s", filepath, e)
        return None

    # Parse YAML frontmatter
    if not text.startswith(_FM_DELIM):
        logger.debug("No frontmatter delimiter in %s", filepath)
        return None

    parts = text.split(_FM_DELIM, 2)
    if len(parts) < 3:
        logger.debug("Unclosed frontmatter in %s", filepath)
        return None

    try:
        raw: dict[str, Any] = yaml.safe_load(parts[1].strip()) or {}
    except yaml.YAMLError as e:
        logger.error("YAML parse error in %s: %s", filepath, e)
        return None

    if not isinstance(raw, dict):
        logger.debug("Frontmatter is not a dict in %s", filepath)
        return None

    # Extract body after frontmatter
    body = parts[2].strip()
    body_preview = body[:300] + ("..." if len(body) > 300 else "")

    return ProjectModel(
        id=str(raw.get("id", filepath.stem)),
        name=str(raw.get("name", filepath.stem.replace("-", " ").title())),
        status=str(raw.get("status", "unknown")),
        goal=str(raw.get("goal", "")),
        repo=str(raw.get("repo", "")),
        private=bool(raw.get("private", True)),
        key_decisions=list(raw.get("key_decisions", [])),
        architecture_notes=str(raw.get("architecture_notes", "")),
        tasks=list(raw.get("tasks", [])),
        body_preview=body_preview,
        file_path=filepath.resolve(),
    )


def list_projects(projects_dir: Path) -> list[ProjectModel]:
    """List all project tracker files, sorted by name.

    Returns an empty list if the directory doesn't exist.
    """
    if not projects_dir.exists():
        logger.warning("Projects directory does not exist: %s", projects_dir)
        return []

    projects: list[ProjectModel] = []
    for f in sorted(projects_dir.glob("*.md")):
        p = parse_project_file(f)
        if p is not None:
            projects.append(p)

    logger.debug("Found %d projects in %s", len(projects), projects_dir)
    return projects


def get_project(projects_dir: Path, project_id: str) -> ProjectModel | None:
    """Get a single project by ID.

    Tries exact filename first, then matches frontmatter ``id`` field.
    Returns None if not found.
    """
    # Exact filename match
    fp = projects_dir / f"{project_id}.md"
    p = parse_project_file(fp)
    if p is not None:
        return p

    # Fallback: search by frontmatter id
    for f in projects_dir.glob("*.md"):
        p = parse_project_file(f)
        if p is not None and p.id == project_id:
            return p

    logger.debug("Project '%s' not found in %s", project_id, projects_dir)
    return None


def search_projects(
    projects_dir: Path,
    query: str,
    projects: Sequence[ProjectModel] | None = None,
) -> list[ProjectModel]:
    """Search projects by keyword in name, goal, or architecture notes.

    If ``projects`` is provided, searches within that list instead of
    re-reading the directory.
    """
    source = list(projects) if projects is not None else list_projects(projects_dir)
    q = query.lower()

    results = []
    for p in source:
        haystack = f"{p.name} {p.goal} {p.architecture_notes}".lower()
        if q in haystack:
            results.append(p)

    logger.debug("Search '%s': %d / %d matches", query, len(results), len(source))
    return results

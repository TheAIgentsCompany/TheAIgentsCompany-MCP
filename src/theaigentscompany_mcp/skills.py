"""Minimal skills data — name + description only.

Reads Hermes skill directories but returns minimal info —
no content, no path, no internal details.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger("theaigentscompany_mcp.skills")


def list_skills(skills_dir: Path) -> list[dict[str, Any]]:
    """List skill names and descriptions (nothing more)."""
    resolved = _resolve_skills_dir(skills_dir)
    if resolved is None:
        return []

    skills: list[dict[str, Any]] = []
    for d in sorted(resolved.glob("*")):
        if not d.is_dir():
            continue
        sf = d / "SKILL.md"
        if not sf.exists():
            continue
        skill = _parse_skill_name_desc(sf)
        if skill:
            skills.append(skill)
    return skills


def _resolve_skills_dir(skills_dir: Path) -> Path | None:
    if skills_dir.exists():
        return skills_dir
    alt = skills_dir.parent.parent / "skills"
    if alt.exists():
        return alt
    logger.warning("Skills directory not found: %s", skills_dir)
    return None


def _parse_skill_name_desc(skill_file: Path) -> dict[str, Any] | None:
    """Extract only name and description from a SKILL.md."""
    try:
        text = skill_file.read_text(encoding="utf-8")
    except OSError:
        return None

    if not text.startswith("---"):
        return {"name": skill_file.parent.name.replace("-", " ").title(), "description": ""}

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {"name": skill_file.parent.name.replace("-", " ").title(), "description": ""}

    try:
        raw: dict[str, Any] = yaml.safe_load(parts[1].strip()) or {}
    except yaml.YAMLError:
        return {"name": skill_file.parent.name.replace("-", " ").title(), "description": ""}

    return {
        "name": str(raw.get("name", skill_file.parent.name.replace("-", " ").title())),
        "description": str(raw.get("description", "")),
    }

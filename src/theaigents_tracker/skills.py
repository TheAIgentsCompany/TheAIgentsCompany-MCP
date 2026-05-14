"""Skills data access layer.

Reads Hermes skill metadata from the skills directory.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from .models import SkillModel

logger = logging.getLogger("theaigents_tracker.skills")


def list_skills(skills_dir: Path, max_count: int = 50) -> list[SkillModel]:
    """List installed Hermes skills matching theaigents-* pattern.

    Each skill is a subdirectory containing a SKILL.md file with YAML
    frontmatter. Falls back to ``skills/`` directory next to parent if
    the given path doesn't exist.
    """
    resolved = _resolve_skills_dir(skills_dir)
    if resolved is None:
        return []

    skills: list[SkillModel] = []
    for d in sorted(resolved.glob("theaigents-*")):
        if not d.is_dir():
            continue
        sf = d / "SKILL.md"
        if not sf.exists():
            continue

        skill = _parse_skill_file(sf)
        if skill is not None:
            skills.append(skill)
            if len(skills) >= max_count:
                break

    logger.debug("Found %d skills in %s", len(skills), resolved)
    return skills


def _resolve_skills_dir(skills_dir: Path) -> Path | None:
    """Resolve the skills directory, trying fallback locations."""
    if skills_dir.exists():
        return skills_dir

    # Try skills/ in parent of parent
    alt = skills_dir.parent.parent / "skills"
    if alt.exists():
        logger.debug("Resolved skills dir via parent fallback: %s", alt)
        return alt

    logger.warning("Skills directory not found: %s (tried %s too)", skills_dir, alt)
    return None


def _parse_skill_file(skill_file: Path) -> SkillModel | None:
    """Parse a single SKILL.md file into a SkillModel."""
    try:
        text = skill_file.read_text(encoding="utf-8")
    except OSError as e:
        logger.error("Failed to read %s: %s", skill_file, e)
        return None

    # Extract YAML frontmatter
    if not text.startswith("---"):
        return SkillModel(
            id=skill_file.parent.name,
            name=skill_file.parent.name.replace("-", " ").title(),
        )

    parts = text.split("---", 2)
    if len(parts) < 3:
        return SkillModel(
            id=skill_file.parent.name,
            name=skill_file.parent.name.replace("-", " ").title(),
        )

    try:
        raw: dict[str, Any] = yaml.safe_load(parts[1].strip()) or {}
    except yaml.YAMLError:
        return SkillModel(
            id=skill_file.parent.name,
            name=skill_file.parent.name.replace("-", " ").title(),
        )

    return SkillModel(
        id=skill_file.parent.name,
        name=str(raw.get("name", skill_file.parent.name.replace("-", " ").title())),
        description=str(raw.get("description", "")),
        path=skill_file.resolve(),
    )

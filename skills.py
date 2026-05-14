"""
Read Hermes skills data from TheAIgentsCompany skills repo.
"""

import re
from pathlib import Path
from typing import Optional

SKILL_META_RE = re.compile(r"^name:\s*\"?(.+?)\"?\s*$", re.MULTILINE)
SKILL_DESC_RE = re.compile(r"^description:\s*\"?(.+?)\"?\s*$", re.MULTILINE)


def list_skills(skills_dir: Path, max_count: int = 50) -> list[dict]:
    """List installed Hermes skills matching theaigents-* pattern."""
    if not skills_dir.exists():
        # Try skills/ clone at infra repo root
        parent = skills_dir.parent.parent
        alt = parent / "skills"
        if alt.exists():
            skills_dir = alt
        else:
            return []
    skills = []
    for d in sorted(skills_dir.glob("theaigents-*")):
        if not d.is_dir():
            continue
        sf = d / "SKILL.md"
        if not sf.exists():
            continue
        text = sf.read_text(encoding="utf-8")
        name_m = SKILL_META_RE.search(text)
        desc_m = SKILL_DESC_RE.search(text)
        skills.append({
            "id": d.name,
            "name": name_m.group(1).strip() if name_m else d.name,
            "description": desc_m.group(1).strip() if desc_m else "",
        })
        if len(skills) >= max_count:
            break
    return skills

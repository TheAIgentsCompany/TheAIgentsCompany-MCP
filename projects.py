"""
Read project tracker markdown files from TheAIgentsCompany infra repo.
Parses YAML frontmatter + body into structured dicts.
"""

import re
from pathlib import Path
from typing import Any, Optional


_FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)


def parse_frontmatter(text: str) -> dict[str, Any]:
    """Extract simple YAML frontmatter from markdown."""
    m = _FM_RE.search(text)
    if not m:
        return {}
    body = m.group(1)
    fields: dict[str, Any] = {}
    current_key: Optional[str] = None
    list_items: list[str] = []
    for line in body.split("\n"):
        fm = re.match(r"^(\w[\w_-]*)\s*:\s*(.*)", line)
        lm = re.match(r"^\s{2}- (.+)", line)
        if fm:
            key, val = fm.group(1).strip(), fm.group(2).strip().strip('"').strip("'")
            if val == "" or val == "[]":
                current_key = key
                list_items = []
            elif val.startswith("[") and val.endswith("]"):
                fields[key] = [x.strip().strip('"').strip("'") for x in val[1:-1].split(",") if x.strip()]
                current_key = None
            else:
                fields[key] = val
                current_key = None
        elif lm and current_key:
            list_items.append(lm.group(1).strip().strip('"').strip("'"))
            fields[current_key] = list_items
        elif line.strip() and not line.startswith(" ") and not line.startswith("\t"):
            current_key = None
    return fields


def parse_project_file(filepath: Path) -> Optional[dict]:
    """Parse a project .md file into a structured dict."""
    if not filepath.exists():
        return None
    text = filepath.read_text(encoding="utf-8")
    fm = parse_frontmatter(text)
    if not fm:
        return None
    # Extract body (everything after frontmatter)
    m = _FM_RE.search(text)
    body = text[m.end():].strip() if m else text.strip()
    return {
        "id": fm.get("id", filepath.stem),
        "name": fm.get("name", filepath.stem.replace("-", " ").title()),
        "status": fm.get("status", "unknown"),
        "goal": fm.get("goal", ""),
        "repo": fm.get("repo", ""),
        "key_decisions": fm.get("key_decisions", []),
        "architecture_notes": fm.get("architecture_notes", ""),
        "tasks": fm.get("tasks", []),
        "body_preview": body[:300] + "..." if len(body) > 300 else body,
    }


def list_projects(projects_dir: Path) -> list[dict]:
    """List all project tracker files."""
    if not projects_dir.exists():
        return []
    projects = []
    for f in sorted(projects_dir.glob("*.md")):
        p = parse_project_file(f)
        if p:
            projects.append(p)
    return projects


def get_project(projects_dir: Path, project_id: str) -> Optional[dict]:
    """Get a single project by ID."""
    # Try direct file
    fp = projects_dir / f"{project_id}.md"
    p = parse_project_file(fp)
    if p:
        return p
    # Try matching by frontmatter id
    for f in projects_dir.glob("*.md"):
        p = parse_project_file(f)
        if p and p["id"] == project_id:
            return p
    return None

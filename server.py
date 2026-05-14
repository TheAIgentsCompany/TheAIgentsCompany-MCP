"""
Project Tracker MCP Server — TheAIgentsCompany

Read-only MCP server exposing company projects and skills.
Designed for Claude Desktop, Hermes, or any MCP-compatible client.

Tools:
  - list_projects      → List all project trackers with status
  - get_project        → Get details of a specific project
  - list_skills        → List installed Hermes skills
  - get_project_count  → Count projects by status
  - search_projects    → Search projects by keyword

Usage:
  python3 server.py                          # Uses default paths
  python3 server.py --projects-dir /path     # Custom projects dir
  python3 server.py --skills-dir /path       # Custom skills dir

Connect from Claude Desktop:
  Add to claude_desktop_config.json:
  {
    "mcpServers": {
      "theaigents-tracker": {
        "command": "python3",
        "args": ["/path/to/server.py"]
      }
    }
  }
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from projects import list_projects, get_project, parse_project_file
from skills import list_skills

# ── Default paths ──────────────────────────────────────────────────────
# Walk up from this file to find the infra repo root
_HERE = Path(__file__).resolve().parent
# By default, look for infra repo in the parent of the MCP project dir
_INFRA_REPO = _HERE.parent / "TheAIgentsCompany-Infra"
if not _INFRA_REPO.exists():
    # Try common locations
    for p in [
        Path.home() / "Github" / "TheAIgentsCompany",
        Path("/workspace") / "agents",
    ]:
        if (p / "agents" / "projects").exists():
            _INFRA_REPO = p
            break

DEFAULT_PROJECTS_DIR = _INFRA_REPO / "agents" / "projects"
DEFAULT_SKILLS_DIR = Path.home() / ".hermes" / "skills"

# ── MCP Server ─────────────────────────────────────────────────────────

mcp = FastMCP(
    "TheAIgentsCompany Tracker",
    instructions="Read-only access to TheAIgentsCompany projects and skills data."
)


def get_dirs() -> tuple[Path, Path]:
    """Return (projects_dir, skills_dir) from args or defaults."""
    global _projects_dir, _skills_dir
    return _projects_dir, _skills_dir


# ═══════════════════════════════════════════════════════════════════════
# TOOLS
# ═══════════════════════════════════════════════════════════════════════


@mcp.tool()
def list_projects_tool(status: str = "") -> str:
    """List all project trackers, optionally filtered by status.

    Args:
        status: Filter by status (active, completed, paused, archived). Empty = all.
    """
    projects_dir, _ = get_dirs()
    projects = list_projects(projects_dir)
    if status:
        projects = [p for p in projects if p.get("status", "").lower() == status.lower()]

    if not projects:
        return "No projects found."
    lines = [f"# {len(projects)} Projects"]
    for p in projects:
        status_icon = {"active": "🟢", "completed": "✅", "paused": "⏸️", "archived": "📦"}.get(p.get("status", ""), "❓")
        lines.append(f"\n{status_icon} **{p['name']}** ({p.get('status', 'unknown')})")
        if p.get("goal"):
            lines.append(f"   Goal: {p['goal'][:150]}")
        if p.get("repo"):
            lines.append(f"   Repo: {p['repo']}")
    return "\n".join(lines)


@mcp.tool()
def get_project_tool(project_id: str) -> str:
    """Get detailed information about a specific project.

    Args:
        project_id: The project ID (filename without .md, e.g. 'website' or 'stats').
    """
    projects_dir, _ = get_dirs()
    p = get_project(projects_dir, project_id)
    if not p:
        return f"Project '{project_id}' not found."

    lines = [
        f"# {p['name']}",
        f"ID: {p['id']}",
        f"Status: {p.get('status', 'unknown')}",
    ]
    if p.get("goal"):
        lines.append(f"\n## Goal\n{p['goal']}")
    if p.get("architecture_notes"):
        lines.append(f"\n## Architecture\n{p['architecture_notes']}")
    if p.get("repo"):
        lines.append(f"\n## Repo\n{p['repo']}")
    if p.get("key_decisions"):
        lines.append("\n## Key Decisions")
        for d in p["key_decisions"]:
            lines.append(f"- {d}")
    if p.get("tasks"):
        lines.append("\n## Tasks")
        for t in p["tasks"]:
            lines.append(f"- {t}")
    return "\n".join(lines)


@mcp.tool()
def list_skills_tool() -> str:
    """List all installed Hermes skills for TheAIgentsCompany."""
    _, skills_dir = get_dirs()
    skills = list_skills(skills_dir)
    if not skills:
        return "No skills found."
    lines = [f"# {len(skills)} Skills\n"]
    for s in skills:
        name = s["id"].replace("theaigents-", "")
        lines.append(f"- **{name}**: {s.get('description', '')}")
    return "\n".join(lines)


@mcp.tool()
def get_project_count_tool() -> str:
    """Count projects grouped by status."""
    projects_dir, _ = get_dirs()
    projects = list_projects(projects_dir)
    counts: dict[str, int] = {}
    for p in projects:
        s = p.get("status", "unknown")
        counts[s] = counts.get(s, 0) + 1
    if not counts:
        return "No projects found."
    lines = [f"**Total**: {len(projects)} projects\n"]
    for status, count in sorted(counts.items()):
        icon = {"active": "🟢", "completed": "✅", "paused": "⏸️", "archived": "📦"}.get(status, "❓")
        lines.append(f"{icon} {status}: {count}")
    return "\n".join(lines)


@mcp.tool()
def search_projects_tool(query: str) -> str:
    """Search projects by keyword in name, goal, or notes.

    Args:
        query: Keyword to search for (case-insensitive).
    """
    projects_dir, _ = get_dirs()
    projects = list_projects(projects_dir)
    query_lower = query.lower()
    results = []
    for p in projects:
        search_text = f"{p.get('name', '')} {p.get('goal', '')} {p.get('architecture_notes', '')}".lower()
        if query_lower in search_text:
            results.append(p)
    if not results:
        return f"No projects matching '{query}'."
    lines = [f"# {len(results)} project(s) matching '{query}'\n"]
    for p in results:
        lines.append(f"- **{p['name']}** ({p.get('status', 'unknown')})")
        if p.get("goal"):
            lines.append(f"  {p['goal'][:120]}")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════
# ENTRYPOINT
# ═══════════════════════════════════════════════════════════════════════

_projects_dir: Path = DEFAULT_PROJECTS_DIR
_skills_dir: Path = DEFAULT_SKILLS_DIR


def main():
    global _projects_dir, _skills_dir

    parser = argparse.ArgumentParser(description="TheAIgentsCompany Project Tracker MCP Server")
    parser.add_argument("--projects-dir", type=Path, default=DEFAULT_PROJECTS_DIR,
                        help=f"Path to projects directory (default: {DEFAULT_PROJECTS_DIR})")
    parser.add_argument("--skills-dir", type=Path, default=DEFAULT_SKILLS_DIR,
                        help=f"Path to skills directory (default: {DEFAULT_SKILLS_DIR})")
    parser.add_argument("--transport", choices=["stdio", "sse"], default="stdio",
                        help="Transport: stdio (local MCP clients) or sse (HTTP, via uvicorn)")
    args = parser.parse_args()

    _projects_dir = args.projects_dir
    _skills_dir = args.skills_dir

    if not _projects_dir.exists():
        print(f"Warning: projects dir not found: {_projects_dir}", file=sys.stderr)
    if not _skills_dir.exists():
        print(f"Warning: skills dir not found: {_skills_dir}", file=sys.stderr)

    print(f"Starting TheAIgentsCompany MCP Tracker...", file=sys.stderr)
    print(f"  Transport: {args.transport}", file=sys.stderr)
    print(f"  Projects:  {_projects_dir}", file=sys.stderr)
    print(f"  Skills:    {_skills_dir}", file=sys.stderr)
    print(f"  Tools: list_projects, get_project, list_skills, get_project_count, search_projects", file=sys.stderr)

    if args.transport == "sse":
        print(f"  URL: http://0.0.0.0:8000/sse", file=sys.stderr)
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()

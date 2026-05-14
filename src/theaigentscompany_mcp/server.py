"""TheAIgentsCompany MCP — Public-facing server.

Tools:
  - list_projects    → List projects with name, status, goal, repo link
  - get_project      → Get details + repo link for a specific project
  - list_skills      → List Hermes skills (name + description only)

Safe for public consumption — no internal architecture exposure.
"""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from .log import setup_logging
from .projects import get_project, list_projects
from .skills import list_skills

logger = logging.getLogger("theaigentscompany_mcp")

DEFAULT_PROJECTS_DIR = Path.home() / "Github" / "TheAIgentsCompany" / "agents" / "projects"
DEFAULT_SKILLS_DIR = Path.home() / ".hermes" / "skills"

mcp = FastMCP(
    "TheAIgentsCompany MCP",
    instructions=(
        "Public access to TheAIgentsCompany projects and skills. "
        "Use list_projects to see active projects with GitHub links, "
        "get_project for more detail on a specific project, "
        "or list_skills to discover available Hermes skills."
    ),
)

_projects_dir: Path = DEFAULT_PROJECTS_DIR
_skills_dir: Path = DEFAULT_SKILLS_DIR


# ── TOOLS ──────────────────────────────────────────────────────────────


@mcp.tool()
def list_projects_tool(status: str = "") -> str:
    """List all projects with name, status, goal (brief), and repo link.

    Args:
        status: Filter by status (active, completed, paused, archived). Empty = all.
    """
    projects = list_projects(_projects_dir)
    if status:
        projects = [p for p in projects if p["status"].lower() == status.lower()]

    if not projects:
        return "No projects found."

    lines = [f"# {len(projects)} Project(s)\n"]
    for p in projects:
        icon = {"active": "🟢", "completed": "✅", "paused": "⏸️", "archived": "📦"}.get(
            p["status"], "❓"
        )
        lines.append(f"{icon} **{p['name']}** ({p['status']})")
        if p.get("goal"):
            lines.append(f"   {p['goal'][:120]}")
        if p.get("repo"):
            lines.append(f"   🔗 {p['repo']}")
    return "\n".join(lines)


@mcp.tool()
def get_project_tool(project_id: str) -> str:
    """Get details and repo link for a specific project.

    Args:
        project_id: The project ID (e.g. 'website' or 'project-tracker-mcp').
    """
    p = get_project(_projects_dir, project_id)
    if p is None:
        return f"Project '{project_id}' not found."

    lines = [
        f"# {p['name']}",
        f"Status: {p['status']}",
    ]
    if p.get("goal"):
        lines.append(f"\n## Goal\n{p['goal']}")
    if p.get("repo"):
        lines.append(f"\n## Repo\n🔗 {p['repo']}")
    lines.append(f"\n_ID: `{p['id']}`_")
    return "\n".join(lines)


@mcp.tool()
def list_skills_tool() -> str:
    """List available Hermes skills with short descriptions."""
    skills = list_skills(_skills_dir)
    if not skills:
        return "No skills found."
    lines = [f"# {len(skills)} Skills\n"]
    for s in skills:
        lines.append(f"- **{s['name']}**: {s['description']}")
    return "\n".join(lines)


# ── ENTRYPOINT ─────────────────────────────────────────────────────────


def main() -> None:
    global _projects_dir, _skills_dir

    parser = argparse.ArgumentParser(description="TheAIgentsCompany MCP Server")
    parser.add_argument(
        "--projects-dir",
        type=Path,
        default=os.environ.get("MCP_PROJECTS_DIR", DEFAULT_PROJECTS_DIR),
        help="Path to projects directory (or MCP_PROJECTS_DIR env var)",
    )
    parser.add_argument(
        "--skills-dir",
        type=Path,
        default=os.environ.get("MCP_SKILLS_DIR", DEFAULT_SKILLS_DIR),
        help="Path to skills directory (or MCP_SKILLS_DIR env var)",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="Transport: stdio (local) or sse (HTTP)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default=os.environ.get("MCP_HOST", "0.0.0.0"),
        help="SSE server host (default: 0.0.0.0, use 127.0.0.1 for local-only)",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    args = parser.parse_args()

    _projects_dir = args.projects_dir
    _skills_dir = args.skills_dir

    setup_logging(verbose=args.verbose)

    if not _projects_dir.exists():
        logger.warning("Projects dir not found: %s", _projects_dir)
    if not _skills_dir.exists():
        logger.warning("Skills dir not found: %s", _skills_dir)

    logger.info("Starting TheAIgentsCompany MCP")
    logger.info("  Transport: %s", args.transport)
    logger.info("  Host:      %s", args.host)
    logger.info("  Projects:  %s", _projects_dir)
    logger.info("  Skills:    %s", _skills_dir)
    logger.info("  Tools: list_projects, get_project, list_skills")

    mcp.settings.host = args.host

    if args.transport == "sse":
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()

"""TheAIgentsCompany Project Tracker — MCP Server.

Professional-grade MCP server exposing company projects, skills,
and operational data through both Tools and Resources.

Tools:
  - list_projects      → List all project trackers (optional status filter)
  - get_project        → Get full details of a specific project
  - list_skills        → List installed Hermes skills
  - get_project_count  → Count projects grouped by status
  - search_projects    → Search projects by keyword

Resources:
  - project://{id}     → Get full markdown content of a project
  - projects://list    → List all projects (machine-readable JSON)
  - projects://counts  → Project counts by status (machine-readable JSON)

Transports:
  - stdio  (default, for Claude Desktop / Hermes)
  - sse    (HTTP, for remote deployment)
"""

from __future__ import annotations

import logging
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from .config import MCPSettings, setup_logging
from .models import ProjectCounts
from .projects import get_project, list_projects, search_projects
from .skills import list_skills

logger = logging.getLogger("theaigents_tracker")

# ── Globals set by main() ──────────────────────────────────────────────
_settings: MCPSettings | None = None


def get_settings() -> MCPSettings:
    assert _settings is not None, "main() must be called first"
    return _settings


# ── MCP Server Instance ────────────────────────────────────────────────

mcp = FastMCP(
    "TheAIgentsCompany Tracker",
    instructions=(
        "Read-only access to TheAIgentsCompany projects and skills data. "
        "Use list_projects / get_project to explore projects, "
        "list_skills to see available Hermes skills, "
        "and resource URIs (project://{id}) for raw content."
    ),
)


# ═══════════════════════════════════════════════════════════════════════
# MCP RESOURCES
# ═══════════════════════════════════════════════════════════════════════


@mcp.resource("project://{project_id}")
def resource_get_project(project_id: str) -> str:
    """Full project data as markdown (URI: project://my-project)."""
    settings = get_settings()
    p = get_project(settings.projects_dir, project_id)
    if p is None:
        raise ValueError(f"Project '{project_id}' not found")

    lines = [
        f"# {p.name}",
        f"ID: {p.id}",
        f"Status: {p.status}",
    ]
    if p.goal:
        lines.append(f"\n## Goal\n{p.goal}")
    if p.architecture_notes:
        lines.append(f"\n## Architecture\n{p.architecture_notes}")
    if p.repo:
        lines.append(f"\n## Repo\n{p.repo}  {'(private)' if p.private else '(public)'}")
    if p.key_decisions:
        lines.append("\n## Key Decisions")
        lines.extend(f"- {d}" for d in p.key_decisions)
    if p.tasks:
        lines.append("\n## Tasks")
        lines.extend(f"- {t}" for t in p.tasks)
    if p.body_preview:
        lines.append(f"\n## Body Preview\n{p.body_preview}")
    return "\n".join(lines)


@mcp.resource("projects://list")
def resource_list_projects() -> str:
    """List all projects as JSON."""
    settings = get_settings()
    projects = list_projects(settings.projects_dir)
    data = [p.model_dump(exclude={"body_preview"}) for p in projects]
    import json

    return json.dumps(data, indent=2, default=str)


@mcp.resource("projects://counts")
def resource_project_counts() -> str:
    """Project counts by status as JSON."""
    settings = get_settings()
    projects = list_projects(settings.projects_dir)
    counts = ProjectCounts.from_project_list(projects)

    import json

    return json.dumps(counts.model_dump(), indent=2)


# ═══════════════════════════════════════════════════════════════════════
# MCP TOOLS
# ═══════════════════════════════════════════════════════════════════════


@mcp.tool()
def list_projects_tool(status: str = "") -> str:
    """List all project trackers, optionally filtered by status.

    Args:
        status: Filter by status (active, completed, paused, archived). Empty = all.
    """
    settings = get_settings()
    projects = list_projects(settings.projects_dir)

    if status:
        projects = [p for p in projects if p.status.lower() == status.lower()]

    if not projects:
        return "No projects found."

    lines = [f"# {len(projects)} Project(s)"]
    for p in projects:
        icon = {
            "active": "🟢",
            "completed": "✅",
            "paused": "⏸️",
            "archived": "📦",
        }.get(p.status, "❓")
        lines.append(f"\n{icon} **{p.name}** ({p.status})")
        if p.goal:
            lines.append(f"   Goal: {p.goal[:150]}")
        if p.repo:
            lines.append(f"   Repo: {p.repo}")
    return "\n".join(lines)


@mcp.tool()
def get_project_tool(project_id: str) -> str:
    """Get detailed information about a specific project.

    Args:
        project_id: The project ID (filename without .md, e.g. 'website' or 'project-tracker-mcp').
    """
    settings = get_settings()
    p = get_project(settings.projects_dir, project_id)
    if p is None:
        return f"Project '{project_id}' not found."

    lines = [
        f"# {p.name}",
        f"ID: `{p.id}`",
        f"Status: {p.status}",
    ]
    if p.goal:
        lines.append(f"\n## Goal\n{p.goal}")
    if p.architecture_notes:
        lines.append(f"\n## Architecture\n{p.architecture_notes}")
    if p.repo:
        lines.append(f"\n## Repo\n{p.repo}")
    if p.key_decisions:
        lines.append("\n## Key Decisions")
        lines.extend(f"- {d}" for d in p.key_decisions)
    if p.tasks:
        lines.append("\n## Tasks")
        for t in p.tasks:
            lines.append(f"- {t}")
    return "\n".join(lines)


@mcp.tool()
def list_skills_tool() -> str:
    """List all installed Hermes skills for TheAIgentsCompany."""
    settings = get_settings()
    skills = list_skills(settings.skills_dir)
    if not skills:
        return "No skills found."
    lines = [f"# {len(skills)} Skills\n"]
    for s in skills:
        name = s.id.replace("theaigents-", "")
        lines.append(f"- **{name}**: {s.description}")
    return "\n".join(lines)


@mcp.tool()
def get_project_count_tool() -> str:
    """Count projects grouped by status."""
    settings = get_settings()
    projects = list_projects(settings.projects_dir)
    counts = ProjectCounts.from_project_list(projects)

    if counts.total == 0:
        return "No projects found."

    lines = [f"**Total**: {counts.total} projects\n"]
    for status, count in sorted(counts.by_status.items()):
        icon = {
            "active": "🟢",
            "completed": "✅",
            "paused": "⏸️",
            "archived": "📦",
        }.get(status, "❓")
        lines.append(f"{icon} {status}: {count}")
    return "\n".join(lines)


@mcp.tool()
def search_projects_tool(query: str) -> str:
    """Search projects by keyword in name, goal, or notes.

    Args:
        query: Keyword to search for (case-insensitive).
    """
    settings = get_settings()
    results = search_projects(settings.projects_dir, query)
    if not results:
        return f"No projects matching '{query}'."

    lines = [f"# {len(results)} project(s) matching '{query}'\n"]
    for p in results:
        lines.append(f"- **{p.name}** ({p.status})")
        if p.goal:
            lines.append(f"  {p.goal[:120]}")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════
# ENTRYPOINT
# ═══════════════════════════════════════════════════════════════════════


def main() -> None:
    """Parse args, configure, and run the MCP server."""
    import argparse

    global _settings

    # Override FastMCP's default streaming mode for broader client compat
    # (Some clients don't support the new streamable HTTP mode)

    parser = argparse.ArgumentParser(
        description="TheAIgentsCompany Project Tracker — MCP Server",
    )
    parser.add_argument(
        "--projects-dir",
        type=Path,
        default=None,
        help="Path to projects directory (default: ~/Github/TheAIgentsCompany/agents/projects)",
    )
    parser.add_argument(
        "--skills-dir",
        type=Path,
        default=None,
        help="Path to skills directory (default: ~/.hermes/skills)",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default=None,
        help="Transport: stdio (local MCP clients) or sse (HTTP)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default=None,
        help="SSE server host (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="SSE server port (default: 8000)",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        default=None,
        help="Enable debug logging",
    )
    args = parser.parse_args()

    # Build settings: CLI args override env vars
    _settings = MCPSettings()
    if args.projects_dir is not None:
        _settings.projects_dir = args.projects_dir
    if args.skills_dir is not None:
        _settings.skills_dir = args.skills_dir
    if args.transport is not None:
        _settings.transport = args.transport
    if args.host is not None:
        _settings.host = args.host
    if args.port is not None:
        _settings.port = args.port
    if args.verbose is not None:
        _settings.verbose = args.verbose

    setup_logging(verbose=_settings.verbose)
    _settings.check_dirs()

    logger.info("Starting TheAIgentsCompany MCP Tracker v2.0.0")
    logger.info("  Transport: %s", _settings.transport)
    logger.info("  Projects:  %s", _settings.projects_dir)
    logger.info("  Skills:    %s", _settings.skills_dir)
    logger.info(
        "  Tools: list_projects, get_project, list_skills, get_project_count, search_projects"
    )
    logger.info("  Resources: project://{id}, projects://list, projects://counts")

    if _settings.transport == "sse":
        logger.info("  URL: http://%s:%d/sse", _settings.host, _settings.port)
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()

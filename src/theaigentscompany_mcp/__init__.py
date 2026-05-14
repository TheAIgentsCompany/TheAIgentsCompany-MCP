"""TheAIgentsCompany MCP — Public-facing server.

Exposes company projects and skills data for AI agents.
Designed to be safe for public consumption — minimal detail,
no internal architecture exposure.
"""

__version__ = "1.0.0"

# Tool definitions for documentation
TOOLS = [
    {
        "name": "list_projects",
        "description": "List all projects with name, status, goal, and repo link",
        "read_only": True,
    },
    {
        "name": "get_project",
        "description": "Get details and repo link for a specific project",
        "read_only": True,
    },
    {
        "name": "list_skills",
        "description": "List available Hermes skills with descriptions",
        "read_only": True,
    },
]

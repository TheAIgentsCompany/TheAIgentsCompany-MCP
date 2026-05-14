![Header](https://capsule-render.vercel.app/api?type=waving&height=220&text=Project%20Tracker%20MCP&fontAlign=50&fontAlignY=40&color=gradient)

# Project Tracker MCP

**Read-only MCP server** for TheAIgentsCompany — exposes projects, skills, and stats so Claude Desktop, Hermes, or any MCP client can query them.

## Tools

| Tool | Description | Read-only |
|------|-------------|-----------|
| `list_projects` | List all project trackers (optional filter by status) | ✅ |
| `get_project` | Get full details of a specific project | ✅ |
| `list_skills` | List installed Hermes skills | ✅ |
| `get_project_count` | Count projects grouped by status | ✅ |
| `search_projects` | Search projects by keyword | ✅ |

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run (stdio mode — for MCP clients)
python3 server.py

# Run with custom paths
python3 server.py --projects-dir /path/to/projects --skills-dir /path/to/skills
```

## Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "theaigents-tracker": {
      "command": "python3",
      "args": ["/absolute/path/to/server.py"]
    }
  }
}
```

## Hermes Integration

Add to your `~/.hermes/config.yaml`:

```yaml
mcp:
  servers:
    - name: theaigents-tracker
      command: python3
      args: ["/path/to/server.py"]
```

## Data Sources

- **Projects**: reads `*.md` files from the infra repo's `agents/projects/` directory
- **Skills**: reads Hermes skill files from `~/.hermes/skills/`

<p align="center">
  Developed by <strong>TheAIgentsCompany</strong> · Powered by <strong>Arty</strong>
</p>

![Footer](https://capsule-render.vercel.app/api?type=waving&height=120&section=footer&color=gradient)

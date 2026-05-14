# Project Tracker MCP

**Professional MCP server** for TheAIgentsCompany — exposes projects, skills, and operational data to AI agents (Claude Desktop, Hermes, etc.).

## Features

### Tools (actions)

| Tool | Description | Read-only |
|------|-------------|-----------|
| `list_projects` | List all project trackers (optional status filter) | ✅ |
| `get_project` | Get full details of a specific project | ✅ |
| `list_skills` | List installed Hermes skills | ✅ |
| `get_project_count` | Count projects grouped by status | ✅ |
| `search_projects` | Search projects by keyword | ✅ |

### Resources (data URIs)

| URI | Description |
|-----|-------------|
| `project://{id}` | Full project data as markdown |
| `projects://list` | All projects as JSON |
| `projects://counts` | Project counts by status as JSON |

## Quick Start

```bash
# Install
pip install -r requirements.txt
pip install -e .

# Run (stdio mode — for MCP clients)
python -m theaigents_tracker

# With custom paths
python -m theaigents_tracker \
  --projects-dir /path/to/projects \
  --skills-dir /path/to/skills

# SSE mode (HTTP — for remote deployment)
python -m theaigents_tracker --transport sse

# Verbose logging
python -m theaigents_tracker -v
```

## Claude Desktop Integration

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "theaigents-tracker": {
      "command": "python3",
      "args": ["-m", "theaigents_tracker"]
    }
  }
}
```

## Hermes Integration

Add to `~/.hermes/config.yaml`:

```yaml
mcp:
  servers:
    - name: theaigents-tracker
      command: python3
      args: ["-m", "theaigents_tracker"]
```

## Configuration

All settings can be configured via CLI args, environment variables (`MCP_` prefix), or a `.env` file:

| Setting | CLI arg | Env var | Default |
|---------|---------|---------|---------|
| Projects dir | `--projects-dir` | `MCP_PROJECTS_DIR` | `~/Github/TheAIgentsCompany/agents/projects` |
| Skills dir | `--skills-dir` | `MCP_SKILLS_DIR` | `~/.hermes/skills` |
| Transport | `--transport` | `MCP_TRANSPORT` | `stdio` |
| Host | `--host` | `MCP_HOST` | `0.0.0.0` |
| Port | `--port` | `MCP_PORT` | `8000` |
| Verbose | `-v` | `MCP_VERBOSE` | `false` |

## Docker Deployment

```bash
docker build -t theaigents-tracker .
docker run -p 8000:8000 \
  -v /path/to/projects:/app/data/projects \
  -e MCP_PROJECTS_DIR=/app/data/projects \
  theaigents-tracker
```

Runs in SSE mode on `http://localhost:8000/sse`.

## Data Sources

- **Projects**: reads `*.md` files from the infra repo's `agents/projects/` directory
- **Skills**: reads Hermes skill files from `~/.hermes/skills/` or `skills/` directory

## Development

```bash
# Install dev dependencies
pip install -e .
pip install pytest ruff mypy

# Run tests
python -m pytest tests/ -v

# Lint & type check
ruff check src/ tests/
mypy src/

# Run all checks
ruff check src/ tests/ && mypy src/ && python -m pytest tests/ -q
```

## Project Structure

```
project-tracker-mcp/
├── src/
│   └── theaigents_tracker/
│       ├── __init__.py     # Package metadata
│       ├── __main__.py     # Entry point (python -m)
│       ├── server.py       # FastMCP instance, tools, resources
│       ├── projects.py     # Project data access layer
│       ├── skills.py       # Skills data access layer
│       ├── models.py       # Pydantic models
│       └── config.py       # pydantic-settings configuration
├── tests/
│   ├── conftest.py         # Test fixtures
│   ├── test_config.py      # Config tests
│   ├── test_projects.py    # Projects layer tests
│   ├── test_skills.py      # Skills layer tests
│   └── test_server.py      # MCP protocol tests
├── pyproject.toml           # Packaging, lint, type config
├── Dockerfile
└── README.md
```

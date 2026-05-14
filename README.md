# TheAIgentsCompany MCP

**Public-facing MCP server** for TheAIgentsCompany — exposes projects and skills to AI agents (Claude Desktop, Hermes, etc.).

## Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects with name, status, goal, and repo link |
| `get_project` | Get details and GitHub repo link for a specific project |
| `list_skills` | List available Hermes skills with descriptions |

Minimal, public-safe — no internal architecture, decisions, or task details are exposed.

## Quick Start

```bash
pip install -r requirements.txt
pip install -e .

# Run (stdio mode — for Claude Desktop / Hermes)
python -m theaigentscompany_mcp

# Verbose
python -m theaigentscompany_mcp -v
```

## Claude Desktop

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "theaigentscompany": {
      "command": "python3",
      "args": ["-m", "theaigentscompany_mcp"]
    }
  }
}
```

## Hermes Integration

Add to `~/.hermes/config.yaml`:

```yaml
mcp:
  servers:
    - name: theaigentscompany
      command: python3
      args: ["-m", "theaigentscompany_mcp"]
```

## Development

```bash
pip install -e .
pip install pytest ruff mypy

python -m pytest tests/ -v
ruff check src/ tests/
mypy src/
```

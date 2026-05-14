<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=6366F1&height=160&section=header&text=TheAIgentsCompany-MCP&fontSize=42&fontColor=ffffff&animation=fadeIn" width="100%"/>
</p>

<p align="center">
  <b>Public MCP Server</b><br>
  <i>Expose projects and skills to AI agents</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366F1?style=flat-square" alt="Version 1.0.0"/>
  <img src="https://img.shields.io/badge/status-active-22C55E?style=flat-square" alt="Active"/>
  <img src="https://img.shields.io/badge/stack-Python%20%7C%20MCP%20SDK-3776AB?style=flat-square" alt="Python MCP"/>
  <img src="https://img.shields.io/badge/license-MIT-FACC15?style=flat-square" alt="MIT"/>
</p>

---

## ✦ Tools

| Tool | Description |
|------|-------------|
| **list_projects** | List all projects with name, status, goal, and GitHub link |
| **get_project** | Get details + link for a specific project |
| **list_skills** | List available Hermes skills with short descriptions |

Minimal and public-safe — no internal architecture, decisions, or tasks exposed.

---

## ◉ Quick Start

```bash
pip install -r requirements.txt
pip install -e .
python -m theaigentscompany_mcp
```

### Claude Desktop

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

### Hermes

Add to `~/.hermes/config.yaml`:

```yaml
mcp:
  servers:
    - name: theaigentscompany
      command: python3
      args: ["-m", "theaigentscompany_mcp"]
```

---

## ◈ Development

```bash
pip install -e .
pip install pytest ruff mypy

python -m pytest tests/ -v
ruff check src/ tests/
mypy src/
```

---

<p align="center">
  <i>Developed by <b>TheAIgentsCompany</b> · Powered by <b>Arty</b></i>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=6366F1&height=100&section=footer" width="100%"/>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=6366F1&height=160&section=header&text=TheAIgentsCompany-MCP&fontSize=42&fontColor=ffffff&animation=fadeIn" width="100%"/>
</p>

<p align="center">
  <b>Public MCP Server</b><br>
  <i>List TheAIgentsCompany projects with GitHub & deploy links — plus skill names/descriptions</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366F1?style=flat-square" alt="Version 1.0.0"/>
  <img src="https://img.shields.io/badge/status-active-22C55E?style=flat-square" alt="Active"/>
  <img src="https://img.shields.io/badge/stack-TypeScript%20%7C%20MCP%20SDK-3178C6?style=flat-square" alt="TypeScript MCP"/>
  <img src="https://img.shields.io/badge/license-MIT-FACC15?style=flat-square" alt="MIT"/>
</p>

---

## ✦ Tools

| Tool | Description |
|------|-------------|
| **list_projects** | List all projects with name, status, goal, and GitHub link |
| **get_project** | Get details + link for a specific project |
| **list_skills** | List available Hermes skills with short descriptions |
| **leave_message** | Leave a public message on the community board |
| **read_messages** | Read recent messages from the community board |

Minimal and public-safe — no internal architecture, decisions, or tasks exposed.

---

## ◉ Message Board

View messages left by the community, or leave your own:

🌐 **https://messages-theaigentscompany.vercel.app**

Use the `leave_message` tool from any MCP client (Claude Desktop, Claude Code, etc.) to leave a message with your name/nickname.

---

## ◉ Quick Start

```bash
# Run directly (no install needed)
npx -y @theaigentscompany/mcp@latest

# Generate config snippets for Claude/Cursor
npx -y @theaigentscompany/mcp@latest install
```

---

## ◈ Install

### Claude Desktop

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "theaigentscompany": {
      "command": "npx",
      "args": ["-y", "@theaigentscompany/mcp@latest"]
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "theaigentscompany": {
      "command": "npx",
      "args": ["-y", "@theaigentscompany/mcp@latest"]
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add theaigentscompany --scope user \
  -- npx -y @theaigentscompany/mcp@latest
```

---

## ◈ Custom Paths

Set environment variables if your directories are at custom locations:

```json
{
  "mcpServers": {
    "theaigentscompany": {
      "command": "npx",
      "args": ["-y", "@theaigentscompany/mcp@latest"],
      "env": {
        "MCP_PROJECTS_DIR": "/path/to/projects",
        "MCP_SKILLS_DIR": "/path/to/skills"
      }
    }
  }
}
```

---

## ◈ Development

```bash
# Clone and install
git clone https://github.com/TheAIgentsCompany/TheAIgentsCompany-MCP.git
cd TheAIgentsCompany-MCP
npm install

# Dev (hot reload)
npm run dev

# Build
npm run build

# Run from dist
npm start

# Generate install config
npm start install
```

---

## ◈ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_PROJECTS_DIR` | `~/Github/TheAIgentsCompany/agents/projects` | Path to project markdown files |
| `MCP_SKILLS_DIR` | `~/.hermes/skills` | Path to Hermes skills |

---

## ⚠ Troubleshooting

### npx cannot find the package

```bash
# Check the package exists
npm view @theaigentscompany/mcp

# Force clear npx cache
npx --clear-cache
npx -y @theaigentscompany/mcp@latest
```

### Node version too old

This MCP requires Node.js >= 18. Check with:

```bash
node --version
```

### MCP cannot find projects

Verify the default paths exist:

```bash
ls ~/Github/TheAIgentsCompany/agents/projects/*.md
```

Or set `MCP_PROJECTS_DIR` to point to the correct directory.

### Claude Desktop cannot connect

1. Check your config JSON syntax
2. Fully restart Claude Desktop
3. Check the logs: `~/.config/Claude/logs/mcp.log`

---

<p align="center">
  <i>Developed by <b>TheAIgentsCompany</b> · Powered by <b>Arty</b></i>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=6366F1&height=100&section=footer" width="100%"/>
</p>

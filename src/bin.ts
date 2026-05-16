#!/usr/bin/env node

/**
 * TheAIgentsCompany MCP — CLI entry point.
 *
 * Usage:
 *   theaigentscompany-mcp              → Start MCP server (stdio)
 *   theaigentscompany-mcp install      → Generate config for Claude/Cursor
 */

import { startServer } from "./server.js";

const COMMAND = process.argv[2];

async function main() {
  if (COMMAND === "install") {
    await installCommand();
  } else {
    // Default: start MCP server
    await startServer();
  }
}

async function installCommand() {
  const packageName = "@theaigentscompany/mcp";
  const npxCommand = `npx -y ${packageName}@latest`;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       TheAIgentsCompany MCP — Configuration                 ║
╚══════════════════════════════════════════════════════════════╝

This MCP reads your local TheAIgentsCompany project files
to expose them to AI agents. It also lists available
Hermes skills (name + description only, no content).

To use it, add one of the following configurations:

───────────────────────────────────────────────────────────────
📋 Claude Desktop
───────────────────────────────────────────────────────────────

Add to ~/.config/Claude/claude_desktop_config.json:

{
  "mcpServers": {
    "theaigentscompany": {
      "command": "npx",
      "args": ["-y", "${packageName}@latest"]
    }
  }
}

───────────────────────────────────────────────────────────────
📋 Cursor
───────────────────────────────────────────────────────────────

Add to your Cursor MCP configuration:

{
  "mcpServers": {
    "theaigentscompany": {
      "command": "npx",
      "args": ["-y", "${packageName}@latest"]
    }
  }
}

───────────────────────────────────────────────────────────────
📋 Claude Code
───────────────────────────────────────────────────────────────

Run this command in your terminal:

claude mcp add theaigentscompany --scope user \\
  -- npx -y ${packageName}@latest

───────────────────────────────────────────────────────────────
📦 Optional: Custom paths
───────────────────────────────────────────────────────────────

Set these environment variables if your project/skills
directories are at custom locations:

  MCP_PROJECTS_DIR=/path/to/projects
  MCP_SKILLS_DIR=/path/to/skills

Example with custom paths:

{
  "mcpServers": {
    "theaigentscompany": {
      "command": "npx",
      "args": ["-y", "${packageName}@latest"],
      "env": {
        "MCP_PROJECTS_DIR": "/path/to/projects",
        "MCP_SKILLS_DIR": "/path/to/skills"
      }
    }
  }
}

───────────────────────────────────────────────────────────────
✅ Ready! Paste the config above into your tool of choice.
`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

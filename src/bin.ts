#!/usr/bin/env node

/**
 * TheAIgentsCompany-MCP — CLI entry point.
 *
 * Usage:
 *   theaigentscompany-mcp              → Start MCP server (stdio)
 *   theaigentscompany-mcp install      → Auto-detect OS, write config, print snippets
 *   theaigentscompany-mcp uninstall    → Remove config entry
 */

import { startServer } from "./server.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const COMMAND = process.argv[2];
const PACKAGE = "@theaigentscompany/mcp";
const SERVER_KEY = "theaigentscompany";

function getClaudeDesktopPath(): string | null {
  const home = homedir();
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS
    const p = resolve(
      home,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
    return p;
  } else if (platform === "linux") {
    return resolve(home, ".config", "Claude", "claude_desktop_config.json");
  } else if (platform === "win32") {
    // Windows: %APPDATA%\Claude\claude_desktop_config.json
    const appData = process.env.APPDATA || resolve(home, "AppData", "Roaming");
    return resolve(appData, "Claude", "claude_desktop_config.json");
  }
  return null;
}

function getMCPConfig() {
  return {
    command: "npx",
    args: ["-y", `${PACKAGE}@latest`],
  };
}

function readJSON(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

async function installCommand() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       TheAIgentsCompany-MCP — Installation                  ║
╚══════════════════════════════════════════════════════════════╝
`);

  // ── Claude Desktop (auto-detect) ──────────────────────────
  const configPath = getClaudeDesktopPath();
  if (configPath) {
    const dir = resolve(configPath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const existing = readJSON(configPath);
    const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
    mcpServers[SERVER_KEY] = getMCPConfig();
    existing.mcpServers = mcpServers;

    writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`  ✅ Written to ${configPath}`);
    console.log(`  Restart Claude Desktop to use the MCP.\n`);
  } else {
    console.log("  ⚠ Could not detect platform for auto-install.\n");
  }

  // ── Claude Code ───────────────────────────────────────────
  console.log(`  📋 Claude Code (CLI):
  Run:
    claude mcp add ${SERVER_KEY} --scope user \\\\
      -- npx -y ${PACKAGE}@latest
`);

  // ── Cursor ────────────────────────────────────────────────
  console.log(`  📋 Cursor:
  Add to your MCP configuration:
    {
      "mcpServers": {
        "${SERVER_KEY}": {
          "command": "npx",
          "args": ["-y", "${PACKAGE}@latest"]
        }
      }
    }
`);

  // ── Custom paths ──────────────────────────────────────────
  console.log(`  📦 Custom paths (optional):
    {
      "mcpServers": {
        "${SERVER_KEY}": {
          "command": "npx",
          "args": ["-y", "${PACKAGE}@latest"],
          "env": {
            "MCP_PROJECTS_DIR": "/path/to/projects",
            "MCP_SKILLS_DIR": "/path/to/skills"
          }
        }
      }
    }
`);
}

async function uninstallCommand() {
  console.log(`\nRemoving ${SERVER_KEY} from config...`);

  // ── Claude Desktop ────────────────────────────────────────
  const configPath = getClaudeDesktopPath();
  if (configPath && existsSync(configPath)) {
    const existing = readJSON(configPath);
    const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};

    if (mcpServers[SERVER_KEY]) {
      delete mcpServers[SERVER_KEY];
      existing.mcpServers = mcpServers;
      writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
      console.log(`  ✅ Removed from ${configPath}`);
    } else {
      console.log(`  ℹ️  ${SERVER_KEY} not found in ${configPath}`);
    }
  } else {
    console.log("  ℹ️  No Claude Desktop config found.");
  }

  // ── Claude Code ───────────────────────────────────────────
  console.log(`
  📋 Claude Code:
    Run:
      claude mcp remove ${SERVER_KEY}
`);
}

async function main() {
  if (COMMAND === "install") {
    await installCommand();
  } else if (COMMAND === "uninstall") {
    await uninstallCommand();
  } else if (COMMAND === "--help" || COMMAND === "-h") {
    console.log(`
TheAIgentsCompany-MCP

Usage:
  theaigentscompany-mcp              Start MCP server (stdio)
  theaigentscompany-mcp install      Install MCP for Claude Desktop (auto-detect OS)
  theaigentscompany-mcp uninstall    Remove MCP from Claude Desktop config

Config also available for: Claude Code CLI, Cursor, ChatGPT Desktop
    `);
  } else {
    // Default: start MCP server
    await startServer();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

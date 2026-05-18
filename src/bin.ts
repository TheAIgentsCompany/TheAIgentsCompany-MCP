#!/usr/bin/env node

/**
 * TheAIgentsCompany-MCP — CLI entry point.
 *
 * Usage:
 *   theaigentscompany-mcp              → Start MCP server (stdio)
 *   theaigentscompany-mcp install      → Auto-detect OS, write config, print snippets
 *   theaigentscompany-mcp uninstall    → Remove config entry
 */

import { startServer, startHttpServer } from "./server.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const COMMAND = process.argv[2];
const PACKAGE = "@theaigentscompany/mcp";
const SERVER_KEY = "theaigentscompany";

// ── Config path detection ────────────────────────────────────────

function getConfigPath(app: string): string | null {
  const home = homedir();
  const p = process.platform;

  const paths: Record<string, Record<string, string>> = {
    claude: {
      darwin: resolve(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      linux: resolve(home, ".config", "Claude", "claude_desktop_config.json"),
      win32: resolve(process.env.APPDATA || resolve(home, "AppData", "Roaming"), "Claude", "claude_desktop_config.json"),
    },
    cursor: {
      darwin: resolve(home, "Library", "Application Support", "Cursor", "config.json"),
      linux: resolve(home, ".config", "Cursor", "config.json"),
      win32: resolve(process.env.APPDATA || resolve(home, "AppData", "Roaming"), "Cursor", "config.json"),
    },
    chatgpt: {
      darwin: resolve(home, "Library", "Application Support", "com.openai.chatgpt", "config.json"),
      linux: resolve(home, ".config", "chatgpt", "config.json"),
      win32: resolve(process.env.APPDATA || resolve(home, "AppData", "Roaming"), "chatgpt", "config.json"),
    },
  };

  return paths[app]?.[p] ?? null;
}

function getCursorMCPPath(): string | null {
  // Cursor also supports ~/.cursor/mcp.json
  const home = homedir();
  const legacy = resolve(home, ".cursor", "mcp.json");
  if (existsSync(legacy)) return legacy;

  // New path
  const appPath = getConfigPath("cursor");
  if (appPath && existsSync(appPath)) return appPath;

  return appPath; // return path even if doesn't exist yet
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

function writeToClaudeDesktop(configPath: string, existing: Record<string, unknown>): boolean {
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SERVER_KEY] = getMCPConfig();
  existing.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
  return true;
}

function writeToCursor(configPath: string, existing: Record<string, unknown>): boolean {
  // Cursor stores MCP under "mcpServers" same as Claude
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SERVER_KEY] = getMCPConfig();
  existing.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
  return true;
}

function writeToChatGPT(configPath: string, existing: Record<string, unknown>): boolean {
  // ChatGPT desktop uses the same mcpServers format
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SERVER_KEY] = getMCPConfig();
  existing.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
  return true;
}

function removeFromConfig(configPath: string): boolean {
  if (!existsSync(configPath)) return false;
  const existing = readJSON(configPath);
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  if (mcpServers[SERVER_KEY]) {
    delete mcpServers[SERVER_KEY];
    existing.mcpServers = mcpServers;
    writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
    return true;
  }
  return false;
}

async function installCommand() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       TheAIgentsCompany-MCP — Installation                  ║
╚══════════════════════════════════════════════════════════════╝
`);

  // ── Claude Desktop ─────────────────────────────────────────
  const claudePath = getConfigPath("claude");
  if (claudePath) {
    const dir = resolve(claudePath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const existing = readJSON(claudePath);
    writeToClaudeDesktop(claudePath, existing);
    console.log(`  ✅ Claude Desktop → ${claudePath}`);
  }

  // ── Cursor ─────────────────────────────────────────────────
  const cursorPath = getCursorMCPPath();
  if (cursorPath) {
    const dir = resolve(cursorPath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const existing = readJSON(cursorPath);
    writeToCursor(cursorPath, existing);
    console.log(`  ✅ Cursor          → ${cursorPath}`);
  } else {
    console.log(`  ℹ️  Cursor not detected. Manual config needed (see below).`);
  }

  // ── ChatGPT Desktop (macOS only) ───────────────────────────
  const gptPath = getConfigPath("chatgpt");
  if (gptPath && (existsSync(gptPath) || process.platform === "darwin")) {
    const dir = resolve(gptPath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const existing = readJSON(gptPath);
    writeToChatGPT(gptPath, existing);
    console.log(`  ✅ ChatGPT Desktop → ${gptPath}`);
  } else {
    console.log(`  ℹ️  ChatGPT Desktop not detected.`);
  }

  // ── Claude Code ────────────────────────────────────────────
  console.log(`\n  📋 Claude Code CLI:\n    claude mcp add ${SERVER_KEY} --scope user \\\\\n      -- npx -y ${PACKAGE}@latest\n`);

  console.log(`  ✅ Ready! Restart your AI client to use the MCP.`);
}

async function uninstallCommand() {
  console.log(`\nRemoving ${SERVER_KEY} from config files...`);

  const apps = ["claude", "cursor", "chatgpt"];
  let found = false;

  for (const app of apps) {
    const configPath = getConfigPath(app);
    if (configPath && removeFromConfig(configPath)) {
      console.log(`  ✅ Removed from ${app} → ${configPath}`);
      found = true;
    }
  }

  // Also check the legacy cursor path
  const cursorMCP = resolve(homedir(), ".cursor", "mcp.json");
  if (removeFromConfig(cursorMCP)) {
    console.log(`  ✅ Removed from Cursor (legacy) → ${cursorMCP}`);
    found = true;
  }

  if (!found) {
    console.log("  ℹ️  No config files found or no entry to remove.");
  }

  console.log(`\n  📋 Claude Code CLI:\n    claude mcp remove ${SERVER_KEY}\n`);
}

async function main() {
  if (COMMAND === "install") {
    await installCommand();
  } else if (COMMAND === "uninstall") {
    await uninstallCommand();
  } else if (COMMAND === "sse") {
    const port = Number(process.argv[3]) || 3000;
    await startHttpServer(port);
  } else if (COMMAND === "--help" || COMMAND === "-h") {
    console.log(`
TheAIgentsCompany-MCP

Usage:
  theaigentscompany-mcp              Start MCP server (stdio)
  theaigentscompany-mcp install      Install for Claude Desktop (auto-detect OS)
  theaigentscompany-mcp uninstall    Remove from config
  theaigentscompany-mcp sse [port]   Start MCP server (HTTP/SSE, default port 3000)
  theaigentscompany-mcp sse          → http://localhost:3000/sse

Detects: Claude Desktop, Cursor, ChatGPT Desktop
Manual: Claude Code CLI, other MCP clients
    `);
  } else {
    await startServer();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

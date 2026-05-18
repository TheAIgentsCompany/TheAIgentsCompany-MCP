#!/usr/bin/env node

/**
 * TheAIgentsCompany-MCP — CLI entry point.
 *
 * Usage:
 *   theaigentscompany-mcp                   Start MCP server (stdio — for local dev)
 *   theaigentscompany-mcp install [url]     Write SSE config to Claude/Cursor/ChatGPT
 *   theaigentscompany-mcp uninstall         Remove SSE config
 *   theaigentscompany-mcp sse [port]        Start MCP server (HTTP/SSE, default port 3010)
 */

import { startServer, startHttpServer } from "./server.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const COMMAND = process.argv[2];
const ARG_URL = process.argv[3];
const SERVER_KEY = "theaigentscompany";
const DEFAULT_SSE_URL = "https://mcp.theaigentscompany.xyz/sse";

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
  const home = homedir();
  const legacy = resolve(home, ".cursor", "mcp.json");
  if (existsSync(legacy)) return legacy;
  const appPath = getConfigPath("cursor");
  if (appPath && existsSync(appPath)) return appPath;
  return appPath;
}

function getSSEConfig(url?: string) {
  return { url: url || DEFAULT_SSE_URL };
}

function readJSON(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function writeTo(client: string, configPath: string, existing: Record<string, unknown>, url?: string): string {
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SERVER_KEY] = getSSEConfig(url);
  existing.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
  return client;
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
  const url = ARG_URL?.startsWith("http") ? ARG_URL : undefined;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       TheAIgentsCompany-MCP — Installation (SSE)            ║
╚══════════════════════════════════════════════════════════════╝
  URL: ${url || DEFAULT_SSE_URL}
`);

  const apps: [string, string | null][] = [
    ["Claude Desktop", getConfigPath("claude")],
    ["Cursor", getCursorMCPPath()],
    ["ChatGPT Desktop", getConfigPath("chatgpt")],
  ];

  for (const [name, configPath] of apps) {
    if (configPath) {
      const dir = resolve(configPath, "..");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const existing = readJSON(configPath);
      writeTo(name, configPath, existing, url);
      console.log(`  ✅ ${name.padEnd(16)} → ${configPath}`);
    } else {
      console.log(`  ℹ️  ${name.padEnd(16)} not detected`);
    }
  }

  console.log(`\n  📋 Claude Code CLI:\n    claude mcp add ${SERVER_KEY} --scope user -- ${url || DEFAULT_SSE_URL}\n`);
  console.log(`  ✅ Done! Restart your AI client.`);
}

async function uninstallCommand() {
  console.log(`\nRemoving "${SERVER_KEY}" from config files...`);

  const apps = ["claude", "cursor", "chatgpt"];
  let found = false;

  for (const app of apps) {
    const configPath = getConfigPath(app);
    if (configPath && removeFromConfig(configPath)) {
      console.log(`  ✅ Removed from ${app} → ${configPath}`);
      found = true;
    }
  }

  const cursorMCP = resolve(homedir(), ".cursor", "mcp.json");
  if (removeFromConfig(cursorMCP)) {
    console.log(`  ✅ Removed from Cursor (legacy) → ${cursorMCP}`);
    found = true;
  }

  if (!found) console.log("  ℹ️  No entries found to remove.");
  console.log(`\n  📋 Claude Code CLI:\n    claude mcp remove ${SERVER_KEY}\n`);
}

async function main() {
  if (COMMAND === "install") {
    await installCommand();
  } else if (COMMAND === "uninstall") {
    await uninstallCommand();
  } else if (COMMAND === "sse") {
    const port = Number(COMMAND === "sse" ? process.argv[3] : undefined) || 3010;
    await startHttpServer(port);
  } else if (COMMAND === "--help" || COMMAND === "-h") {
    console.log(`
TheAIgentsCompany-MCP

Usage:
  theaigentscompany-mcp                   Start MCP server (stdio)
  theaigentscompany-mcp install [url]     Write SSE config to Claude/Cursor/ChatGPT
  theaigentscompany-mcp uninstall         Remove SSE config from all detected apps
  theaigentscompany-mcp sse [port]        Start HTTP/SSE server (default port 3010)

The install command runs once via npx, then writes URL-based config.
Your AI client connects via SSE — no npx or Node.js needed on the client.

Examples:
  npx -y @theaigentscompany/mcp@latest install
  npx -y @theaigentscompany/mcp@latest install https://custom-url.com/sse
    `);
  } else {
    await startServer();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

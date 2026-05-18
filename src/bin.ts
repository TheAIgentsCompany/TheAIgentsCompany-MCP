#!/usr/bin/env node

/**
 * TheAIgentsCompany-MCP — CLI entry point.
 *
 * Usage:
 *   theaigentscompany-mcp                   → Start MCP server (stdio)
 *   theaigentscompany-mcp install           → Auto-detect OS, write config (stdio)
 *   theaigentscompany-mcp install --sse     → Write config with SSE URL
 *   theaigentscompany-mcp install --sse https://mcp.example.com/sse
 *   theaigentscompany-mcp uninstall         → Remove config entry
 *   theaigentscompany-mcp uninstall --sse   → Remove SSE config entry
 *   theaigentscompany-mcp sse [port]        → Start MCP server (HTTP/SSE)
 */

import { startServer, startHttpServer } from "./server.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const COMMAND = process.argv[2];
const ARGS = process.argv.slice(3);
const PACKAGE = "@theaigentscompany/mcp";
const SERVER_KEY_STDIO = "theaigentscompany";
const SERVER_KEY_SSE = "theaigentscompany-sse";
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

function getSSEConfig(url?: string) {
  return {
    url: url || DEFAULT_SSE_URL,
  };
}

function detectSSEMode(): boolean {
  return ARGS.includes("--sse");
}

function getSSEUrl(): string {
  const idx = ARGS.indexOf("--sse");
  // Next arg after --sse might be a custom URL
  if (idx >= 0 && idx + 1 < ARGS.length && ARGS[idx + 1].startsWith("http")) {
    return ARGS[idx + 1];
  }
  return DEFAULT_SSE_URL;
}

function readJSON(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function writeToClaudeDesktop(configPath: string, existing: Record<string, unknown>, sse?: boolean, sseUrl?: string): boolean {
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  if (sse) {
    mcpServers[SERVER_KEY_SSE] = getSSEConfig(sseUrl);
  } else {
    mcpServers[SERVER_KEY_STDIO] = getMCPConfig();
  }
  existing.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
  return true;
}

function writeToCursor(configPath: string, existing: Record<string, unknown>, sse?: boolean, sseUrl?: string): boolean {
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  if (sse) {
    mcpServers[SERVER_KEY_SSE] = getSSEConfig(sseUrl);
  } else {
    mcpServers[SERVER_KEY_STDIO] = getMCPConfig();
  }
  existing.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
  return true;
}

function writeToChatGPT(configPath: string, existing: Record<string, unknown>, sse?: boolean, sseUrl?: string): boolean {
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  if (sse) {
    mcpServers[SERVER_KEY_SSE] = getSSEConfig(sseUrl);
  } else {
    mcpServers[SERVER_KEY_STDIO] = getMCPConfig();
  }
  existing.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
  return true;
}

function removeFromConfig(configPath: string, sse?: boolean): boolean {
  if (!existsSync(configPath)) return false;
  const existing = readJSON(configPath);
  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  const key = sse ? SERVER_KEY_SSE : SERVER_KEY_STDIO;
  if (mcpServers[key]) {
    delete mcpServers[key];
    existing.mcpServers = mcpServers;
    writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf-8");
    return true;
  }
  return false;
}

async function installCommand() {
  const sse = ARGS.includes("--stdio") ? false : true; // SSE by default, --stdio for legacy
  const sseUrl = getSSEUrl();
  const mode = sse ? "SSE" : "stdio";
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       TheAIgentsCompany-MCP — Installation (${mode})                ║
╚══════════════════════════════════════════════════════════════╝
`);

  // ── Claude Desktop ─────────────────────────────────────────
  const claudePath = getConfigPath("claude");
  if (claudePath) {
    const dir = resolve(claudePath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const existing = readJSON(claudePath);
    writeToClaudeDesktop(claudePath, existing, sse, sseUrl);
    console.log(`  ✅ Claude Desktop → ${claudePath}`);
  }

  // ── Cursor ─────────────────────────────────────────────────
  const cursorPath = getCursorMCPPath();
  if (cursorPath) {
    const dir = resolve(cursorPath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const existing = readJSON(cursorPath);
    writeToCursor(cursorPath, existing, sse, sseUrl);
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
    writeToChatGPT(gptPath, existing, sse, sseUrl);
    console.log(`  ✅ ChatGPT Desktop → ${gptPath}`);
  } else {
    console.log(`  ℹ️  ChatGPT Desktop not detected.`);
  }

  // ── Claude Code ────────────────────────────────────────────
  if (sse) {
    console.log(`\n  📋 Claude Code CLI:\n    claude mcp add theaigentscompany-sse --scope user \\\\\n      -- ${sseUrl}\n`);
  } else {
    console.log(`\n  📋 Claude Code CLI:\n    claude mcp add theaigentscompany --scope user \\\\\n      -- npx -y ${PACKAGE}@latest\n`);
  }

  console.log(`  ✅ Ready! Restart your AI client to use the MCP (${mode}).`);
}

async function uninstallCommand() {
  const sse = detectSSEMode();
  const modeStr = sse ? " (SSE)" : "";
  console.log(`\nRemoving ${sse ? SERVER_KEY_SSE : SERVER_KEY_STDIO} from config files...`);

  const apps = ["claude", "cursor", "chatgpt"];
  let found = false;

  for (const app of apps) {
    const configPath = getConfigPath(app);
    if (configPath && removeFromConfig(configPath, sse)) {
      console.log(`  ✅ Removed from ${app} → ${configPath}`);
      found = true;
    }
  }

  // Also check the legacy cursor path
  const cursorMCP = resolve(homedir(), ".cursor", "mcp.json");
  if (removeFromConfig(cursorMCP, sse)) {
    console.log(`  ✅ Removed from Cursor (legacy) → ${cursorMCP}`);
    found = true;
  }

  if (!found) {
    console.log("  ℹ️  No config files found or no entry to remove.");
  }

  console.log(`\n  📋 Claude Code CLI:\n    claude mcp remove ${sse ? SERVER_KEY_SSE : SERVER_KEY_STDIO}\n`);
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
  theaigentscompany-mcp                   Start MCP server (stdio)
  theaigentscompany-mcp install           Write SSE config (URL-based, default) — no npx needed on client
  theaigentscompany-mcp install --stdio   Write stdio config (legacy, uses npx locally)
  theaigentscompany-mcp install --sse https://your-url/sse    Custom SSE URL
  theaigentscompany-mcp uninstall         Remove config (auto-detects SSE vs stdio)
  theaigentscompany-mcp uninstall --sse   Force remove SSE config
  theaigentscompany-mcp sse [port]        Start MCP server (HTTP/SSE, default port 3010)

Examples:
  npx -y @theaigentscompany/mcp@latest install              # SSE (recommended)
  npx -y @theaigentscompany/mcp@latest install --stdio      # stdio (legacy)
  npx -y @theaigentscompany/mcp@latest install --sse https://mcp.theaigentscompany.xyz/sse

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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listProjects, getProject, listSkills, leaveMessage, readMessages, leaveGuestbookEntry, readGuestbook } from "./tools.js";

const SERVER_NAME = "TheAIgentsCompany-MCP";
const SERVER_VERSION = "1.0.0";

/**
 * Create and configure the MCP server.
 * Registers all tools (list_projects, get_project, list_skills).
 */
export function createServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  // ── Tools list ──────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_projects",
        description: "List all projects with name, status, goal, and repo link. Optional status filter.",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Filter by status (active, completed, paused, archived). Empty = all.",
              default: "",
            },
          },
        },
      },
      {
        name: "get_project",
        description: "Get details and GitHub repo link for a specific project.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "The project ID (e.g. 'website' or 'project-tracker-mcp').",
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "list_skills",
        description: "List Hermes skill names and descriptions (no skill content exposed).",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "leave_message",
        description: "Leave a public message on TheAIgentsCompany message board.",
        inputSchema: {
          type: "object",
          properties: {
            pseudo: {
              type: "string",
              description: "Your name or nickname",
            },
            message: {
              type: "string",
              description: "The message you want to leave",
            },
          },
          required: ["pseudo", "message"],
        },
      },
      {
        name: "read_messages",
        description: "Read recent messages from the public message board.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of messages to fetch (max 100, default 20)",
              default: 20,
            },
          },
        },
      },
      {
        name: "leave_guestbook_entry",
        description: "Leave a signed entry in the AI-era guestbook. Say who you are (pseudo), your message, and what agent+model you are using (automatically captured if you include them).",
        inputSchema: {
          type: "object",
          properties: {
            pseudo: {
              type: "string",
              description: "Your name or nickname",
            },
            message: {
              type: "string",
              description: "Your message for the guestbook",
            },
            agent: {
              type: "string",
              description: "The AI agent or client you are using (e.g. Claude Desktop, Claude Code, Cursor)",
            },
            model: {
              type: "string",
              description: "The model you are running on (e.g. Claude Sonnet 4, GPT-4o)",
            },
          },
          required: ["pseudo", "message"],
        },
      },
      {
        name: "read_guestbook",
        description: "Read recent entries from the AI-era guestbook.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of entries to fetch (max 100, default 20)",
              default: 20,
            },
          },
        },
      },
    ],
  }));

  // ── Tool calls ─────────────────────────────────────────────────────

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case "list_projects": {
          const status = (args?.status as string) ?? "";
          let projects = await listProjects();
          if (status) {
            projects = projects.filter(
              (p) => p.status.toLowerCase() === status.toLowerCase()
            );
          }
          if (projects.length === 0) {
            return { content: [{ type: "text" as const, text: "No projects found." }] };
          }

          const lines = [`# ${projects.length} Project(s)\n`];
          for (const p of projects) {
            const icon: Record<string, string> = {
              active: "🟢",
              completed: "✅",
              paused: "⏸️",
              archived: "📦",
            };
            lines.push(`${icon[p.status] ?? "❓"} **${p.name}** (${p.status})`);
            if (p.goal) lines.push(`   ${p.goal.slice(0, 120)}`);
            if (p.repo) lines.push(`   🔗 ${p.repo}`);
            if (p.url) lines.push(`   🌐 ${p.url}`);
          }
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        case "get_project": {
          const projectId = args?.project_id as string;
          if (!projectId) {
            return {
              content: [{ type: "text" as const, text: "Missing required argument: project_id." }],
              isError: true,
            };
          }
          const p = await getProject(projectId);
          if (!p) {
            return { content: [{ type: "text" as const, text: `Project '${projectId}' not found.` }] };
          }

          const lines = [
            `# ${p.name}`,
            `Status: ${p.status}`,
          ];
          if (p.goal) lines.push(`\n## Goal\n${p.goal}`);
          if (p.repo) lines.push(`\n## Repo\n🔗 ${p.repo}`);
          if (p.url) lines.push(`\n## Deploy\n🌐 ${p.url}`);
          lines.push(`\n_ID: \`${p.id}\`_`);
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        case "list_skills": {
          const skills = await listSkills();
          if (skills.length === 0) {
            return { content: [{ type: "text" as const, text: "No skills found." }] };
          }
          const lines = [`# ${skills.length} Skills\n`];
          for (const s of skills) {
            lines.push(`- **${s.name}**: ${s.description}`);
          }
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        case "leave_message": {
          const pseudo = (args?.pseudo as string) ?? "";
          const message = (args?.message as string) ?? "";

          if (!pseudo.trim() || !message.trim()) {
            return {
              content: [{ type: "text" as const, text: "Both pseudo and message are required." }],
              isError: true,
            };
          }

          const result = await leaveMessage(pseudo, message);
          if (!result.success) {
            return {
              content: [{ type: "text" as const, text: `Failed to save message: ${result.error}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: "text" as const, text: `✅ Message saved! View it at https://messages-theaigentscompany.vercel.app` }],
          };
        }

        case "read_messages": {
          const limit = Math.min((args?.limit as number) ?? 20, 100);
          const result = await readMessages(limit);

          if (!result.success || !result.data) {
            return {
              content: [{ type: "text" as const, text: `Failed to read messages: ${result.error}` }],
              isError: true,
            };
          }

          if (result.data.length === 0) {
            return {
              content: [{ type: "text" as const, text: "No messages yet. Be the first with leave_message!" }],
            };
          }

          const lines = [`# ${result.data.length} Recent Messages\n`];
          for (const m of result.data) {
            const date = new Date(m.created_at!).toLocaleDateString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
            lines.push(`**${m.pseudo}** (${date})`);
            lines.push(`  ${m.message}`);
            lines.push("");
          }
          lines.push(`---\nView all at https://messages-theaigentscompany.vercel.app`);
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        case "leave_guestbook_entry": {
          const pseudo = (args?.pseudo as string) ?? "";
          const message = (args?.message as string) ?? "";
          const agent = (args?.agent as string) ?? "";
          const model = (args?.model as string) ?? "";

          if (!pseudo.trim() || !message.trim()) {
            return {
              content: [{ type: "text" as const, text: "Both pseudo and message are required." }],
              isError: true,
            };
          }

          const result = await leaveGuestbookEntry(pseudo, message, agent, model);
          if (!result.success) {
            return {
              content: [{ type: "text" as const, text: `Failed to save entry: ${result.error}` }],
              isError: true,
            };
          }

          const agentLine = agent ? ` from ${agent}${model ? ` (${model})` : ""}` : "";
          return {
            content: [{ type: "text" as const, text: `✅ Guestbook entry #${result.entry_id} saved!${agentLine}\nView all entries at https://guestbooktheaigentscompany.vercel.app` }],
          };
        }

        case "read_guestbook": {
          const limit = Math.min((args?.limit as number) ?? 20, 100);
          const result = await readGuestbook(limit);

          if (!result.success || !result.data) {
            return {
              content: [{ type: "text" as const, text: `Failed to read guestbook: ${result.error}` }],
              isError: true,
            };
          }

          if (result.data.length === 0) {
            return {
              content: [{ type: "text" as const, text: "The guestbook is empty. Be the first with leave_guestbook_entry!" }],
            };
          }

          const lines = [`# 📖 ${result.data.length} Recent Guestbook Entries\n`];
          for (const e of result.data) {
            const date = new Date(e.created_at!).toLocaleDateString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
            lines.push(`**#${e.id} — ${e.pseudo}** (${date})`);
            if (e.agent) lines.push(`   🤖 ${e.agent}${e.model ? ` · 🧠 ${e.model}` : ""}`);
            lines.push(`   ${e.message}`);
            lines.push("");
          }
          lines.push(`---\nView all at https://guestbooktheaigentscompany.vercel.app`);
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        default:
          return {
            content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  console.error("Starting TheAIgentsCompany-MCP");
  console.error(`  Tools: list_projects, get_project, list_skills`);

  await server.connect(transport);
}

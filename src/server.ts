import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listProjects, getProject, listSkills } from "./tools.js";

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

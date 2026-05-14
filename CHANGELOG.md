# Changelog

## 1.0.0 (2026-05-14)

- Complete rewrite from Python to TypeScript
- MCP SDK: `@modelcontextprotocol/sdk` (stdio transport)
- 3 tools: `list_projects`, `get_project`, `list_skills`
- Installable via `npx -y @theaigentscompany/mcp@latest`
- `install` command generates config for Claude Desktop, Cursor, Claude Code
- Reads projects from `~/Github/TheAIgentsCompany/agents/projects/*.md`
- Reads skills from `~/.hermes/skills/`
- MIT license

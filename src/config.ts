import { homedir } from "os";
import { resolve } from "path";

/**
 * Configuration for the MCP server.
 * Reads env vars with sensible defaults for TheAIgentsCompany.
 */
export interface Config {
  projectsDir: string;
  skillsDir: string;
}

export function getConfig(): Config {
  return {
    projectsDir:
      process.env.MCP_PROJECTS_DIR ??
      resolve(homedir(), "Github", "TheAIgentsCompany", "agents", "projects"),
    skillsDir:
      process.env.MCP_SKILLS_DIR ?? resolve(homedir(), ".hermes", "skills"),
  };
}

export function validateConfig(config: Config): string[] {
  const warnings: string[] = [];
  // We don't check existence at config time - files may be mounted later
  return warnings;
}

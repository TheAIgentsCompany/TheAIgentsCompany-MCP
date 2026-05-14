import { readFileSync, existsSync, readdirSync } from "fs";
import { readdir } from "fs/promises";
import { join, resolve } from "path";
import matter from "gray-matter";

export interface Project {
  id: string;
  name: string;
  status: string;
  goal: string;
  repo: string;
}

export interface Skill {
  name: string;
  description: string;
}

// ── Projects ────────────────────────────────────────────────────────────

export function listProjects(projectsDir: string): Project[] {
  if (!existsSync(projectsDir)) return [];

  const entries = readdirSyncSafe(projectsDir) ?? [];
  const projects: Project[] = [];

  for (const entry of entries.sort()) {
    if (!entry.endsWith(".md")) continue;
    const p = parseProjectFile(resolve(projectsDir, entry));
    if (p) projects.push(p);
  }
  return projects;
}

export function getProject(projectsDir: string, projectId: string): Project | undefined {
  // Exact filename match
  const exact = resolve(projectsDir, `${projectId}.md`);
  const p = parseProjectFile(exact);
  if (p) return p;

  // Fallback: search frontmatter id
  const entries = readdirSyncSafe(projectsDir) ?? [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const fp = resolve(projectsDir, entry);
    const parsed = parseProjectFile(fp);
    if (parsed && parsed.id === projectId) return parsed;
  }
  return undefined;
}

function parseProjectFile(filepath: string): Project | undefined {
  if (!existsSync(filepath)) return undefined;

  try {
    const content = readFileSync(filepath, "utf-8");
    const { data } = matter(content);

    return {
      id: String(data.id ?? filepath.split("/").pop()?.replace(".md", "") ?? ""),
      name: String(data.name ?? filepath.split("/").pop()?.replace(".md", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? ""),
      status: String(data.status ?? "unknown"),
      goal: String(data.goal ?? ""),
      repo: String(data.repo ?? ""),
    };
  } catch {
    return undefined;
  }
}

// ── Skills ──────────────────────────────────────────────────────────────

export async function listSkills(skillsDir: string): Promise<Skill[]> {
  if (!existsSync(skillsDir)) return [];

  const entries = await readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const skills: Skill[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;

    const skill = parseSkillFile(skillFile);
    if (skill) skills.push(skill);
  }
  return skills;
}

function parseSkillFile(filepath: string): Skill | undefined {
  try {
    const content = readFileSync(filepath, "utf-8");
    const { data } = matter(content);

    return {
      name: String(data.name ?? filepath.split("/").slice(-2, -1)[0]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? ""),
      description: String(data.description ?? ""),
    };
  } catch {
    return undefined;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function readdirSyncSafe(dir: string): string[] | undefined {
  try {
    return readdirSync(dir);
  } catch {
    return undefined;
  }
}

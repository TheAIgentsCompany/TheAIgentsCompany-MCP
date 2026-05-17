import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import matter from "gray-matter";
import { getSupabaseClient } from "./supabase.js";

export interface Project {
  id: string;
  name: string;
  status: string;
  goal: string;
  repo: string;
  url: string;
}

export interface Skill {
  name: string;
  description: string;
}

// ── Projects (Supabase with local fallback) ──────────────────────────

export async function listProjects(projectsDir: string): Promise<Project[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("name");

    if (!error && data && data.length > 0) {
      return data as Project[];
    }
  } catch {
    // Supabase unavailable, fall back to local files
  }

  return listProjectsLocal(projectsDir);
}

export async function getProject(
  projectsDir: string,
  projectId: string
): Promise<Project | undefined> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!error && data) {
      return data as Project;
    }
  } catch {
    // Supabase unavailable, fall back to local files
  }

  return getProjectLocal(projectsDir, projectId);
}

// ── Skills (Supabase with local fallback) ────────────────────────────

export async function listSkills(skillsDir: string): Promise<Skill[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .order("name");

    if (!error && data && data.length > 0) {
      return data as Skill[];
    }
  } catch {
    // Supabase unavailable, fall back to local files
  }

  return listSkillsLocal(skillsDir);
}

// ── Local file fallback implementations ─────────────────────────────

function listProjectsLocal(projectsDir: string): Project[] {
  if (!existsSync(projectsDir)) return [];

  const entries = readdirSync(projectsDir).sort();
  const projects: Project[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const p = parseProjectFile(resolve(projectsDir, entry));
    if (p) projects.push(p);
  }
  return projects;
}

function getProjectLocal(
  projectsDir: string,
  projectId: string
): Project | undefined {
  // exact filename match
  const fp = resolve(projectsDir, `${projectId}.md`);
  const p = parseProjectFile(fp);
  if (p) return p;

  // fallback: search frontmatter id
  const entries = readdirSync(projectsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const parsed = parseProjectFile(resolve(projectsDir, entry));
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
      name: String(
        data.name ??
          filepath
            .split("/")
            .pop()
            ?.replace(".md", "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) ?? ""
      ),
      status: String(data.status ?? "unknown"),
      goal: String(data.goal ?? ""),
      repo: String(data.repo ?? ""),
      url: String(data.url ?? ""),
    };
  } catch {
    return undefined;
  }
}

function listSkillsLocal(skillsDir: string): Skill[] {
  if (!existsSync(skillsDir)) return [];

  const entries = readdirSync(skillsDir);
  const skills: Skill[] = [];

  for (const entry of entries.sort()) {
    const sf = join(skillsDir, entry, "SKILL.md");
    if (!existsSync(sf)) continue;
    const s = parseSkillFile(sf);
    if (s) skills.push(s);
  }
  return skills;
}

function parseSkillFile(filepath: string): Skill | undefined {
  try {
    const content = readFileSync(filepath, "utf-8");
    const { data } = matter(content);
    return {
      name: String(
        data.name ??
          filepath.split("/").slice(-2, -1)[0]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? ""
      ),
      description: String(data.description ?? ""),
    };
  } catch {
    return undefined;
  }
}

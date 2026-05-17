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

// ── Projects (Supabase only) ───────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name");

  if (error) {
    console.error("Supabase query error:", error.message);
    return [];
  }
  return (data as Project[]) ?? [];
}

export async function getProject(
  projectId: string
): Promise<Project | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    return undefined;
  }
  return data as Project | undefined;
}

// ── Skills (Supabase only) ─────────────────────────────────────────

export async function listSkills(): Promise<Skill[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .order("name");

  if (error) {
    console.error("Supabase query error:", error.message);
    return [];
  }
  return (data as Skill[]) ?? [];
}

// ── Messages (public board) ────────────────────────────────────────

export interface Message {
  id?: number;
  pseudo: string;
  message: string;
  created_at?: string;
}

export async function leaveMessage(
  pseudo: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("messages").insert({
    pseudo: pseudo.trim(),
    message: message.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function readMessages(
  limit: number = 20
): Promise<{ success: boolean; data?: Message[]; error?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id,pseudo,message,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data: data as Message[] };
}

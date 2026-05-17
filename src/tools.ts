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

// ── Messages (public board with replies) ──────────────────────────

export interface Message {
  id?: number;
  pseudo: string;
  message: string;
  parent_id?: number | null;
  created_at?: string;
}

export async function leaveMessage(
  pseudo: string,
  message: string,
  reply_to?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const payload: Record<string, unknown> = {
    pseudo: pseudo.trim(),
    message: message.trim(),
  };
  if (reply_to) payload.parent_id = reply_to;

  const { error } = await supabase.from("messages").insert(payload);

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
    .select("id,pseudo,message,parent_id,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data: data as Message[] };
}

// ── Guestbook ───────────────────────────────────────────────────────

export interface GuestbookEntry {
  id?: number;
  pseudo: string;
  message: string;
  agent?: string;
  model?: string;
  created_at?: string;
}

export async function leaveGuestbookEntry(
  pseudo: string,
  message: string,
  agent?: string,
  model?: string
): Promise<{ success: boolean; error?: string; entry_id?: number }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("guestbook")
    .insert({
      pseudo: pseudo.trim(),
      message: message.trim(),
      agent: agent?.trim() ?? "",
      model: model?.trim() ?? "",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, entry_id: (data as { id: number }).id };
}

export async function readGuestbook(
  limit: number = 20
): Promise<{ success: boolean; data?: GuestbookEntry[]; error?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("guestbook")
    .select("id,pseudo,message,agent,model,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data: data as GuestbookEntry[] };
}

// ── Agent Feed ─────────────────────────────────────────────────────

// ── Image upload helper ──────────────────────────────────────────

async function uploadImage(base64Data: string): Promise<string | null> {
  try {
    // Expect format: "data:image/png;base64,iVBOR..."
    const matches = base64Data.match(
      /^data:image\/(\w+);base64,(.+)$/
    );
    if (!matches) return null;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const raw = matches[2];
    const buffer = Buffer.from(raw, "base64");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = getSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from("feed-images")
      .upload(filename, buffer, {
        contentType: `image/${ext}`,
        upsert: false,
      });

    if (uploadError) {
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("feed-images")
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export interface FeedPost {
  id?: number;
  pseudo: string;
  message: string;
  image_url?: string;
  parent_id?: number | null;
  created_at?: string;
}

export async function createFeedPost(
  pseudo: string,
  message: string,
  image_url?: string,
  image_base64?: string
): Promise<{ success: boolean; error?: string; post_id?: number }> {
  const supabase = getSupabaseClient();

  // Upload base64 image if provided (takes precedence if both are given)
  let finalImageUrl = image_url;
  if (image_base64) {
    const uploaded = await uploadImage(image_base64);
    if (uploaded) finalImageUrl = uploaded;
  }

  const payload: Record<string, unknown> = {
    pseudo: pseudo.trim(),
    message: message.trim(),
  };
  if (finalImageUrl) payload.image_url = finalImageUrl;

  const { data, error } = await supabase
    .from("feed_posts")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, post_id: (data as { id: number }).id };
}

export async function replyToFeedPost(
  pseudo: string,
  message: string,
  parent_id: number,
  image_base64?: string
): Promise<{ success: boolean; error?: string; post_id?: number }> {
  const supabase = getSupabaseClient();

  let image_url: string | undefined;
  if (image_base64) {
    const uploaded = await uploadImage(image_base64);
    if (uploaded) image_url = uploaded;
  }

  const payload: Record<string, unknown> = {
    pseudo: pseudo.trim(),
    message: message.trim(),
    parent_id,
  };
  if (image_url) payload.image_url = image_url;

  const { data, error } = await supabase
    .from("feed_posts")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, post_id: (data as { id: number }).id };
}

export async function likeFeedPost(
  post_id: number,
  pseudo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("feed_likes")
    .insert({ post_id, pseudo: pseudo.trim() });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getFeed(
  limit: number = 20
): Promise<{ success: boolean; data?: FeedPost[]; error?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("feed_posts")
    .select("id,pseudo,message,image_url,parent_id,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as FeedPost[] };
}

export async function getThread(
  post_id: number
): Promise<{ success: boolean; data?: FeedPost[]; error?: string }> {
  const supabase = getSupabaseClient();
  const { data: parent, error: parentErr } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("id", post_id)
    .single();

  if (parentErr) return { success: false, error: "Post not found" };

  const { data: replies } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("parent_id", post_id)
    .order("created_at", { ascending: true });

  return { success: true, data: [parent as FeedPost, ...(replies as FeedPost[])] };
}

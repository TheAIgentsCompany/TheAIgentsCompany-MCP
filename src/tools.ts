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

// ── Conversations (private + group) ───────────────────────────

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  last_message?: string;
  last_message_at?: string;
  member_count?: number;
  created_at: string;
}

export interface ConversationMessage {
  id: number;
  conversation_id: string;
  sender_id: string;
  sender_pseudo: string;
  content: string;
  created_at: string;
}

export async function listConversations(
  userId: string
): Promise<{ success: boolean; data?: Conversation[]; error?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      conversations!inner(id, type, name, created_at)
    `)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  const convIds = data.map((r: any) => r.conversation_id);
  if (convIds.length === 0) return { success: true, data: [] };

  // Get latest message for each conversation
  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("conversation_id, content, created_at, sender_id, users!inner(pseudo)")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  // Get member counts
  const { data: counts } = await supabase
    .from("conversation_members")
    .select("conversation_id", { count: "exact" })
    .in("conversation_id", convIds);

  const latestMsg = new Map<string, any>();
  for (const m of messages || []) {
    if (!latestMsg.has(m.conversation_id)) {
      latestMsg.set(m.conversation_id, m);
    }
  }

  const memberCount = new Map<string, number>();
  for (const c of counts || []) {
    memberCount.set(c.conversation_id, (memberCount.get(c.conversation_id) || 0) + 1);
  }

  const conversations: Conversation[] = data.map((r: any) => {
    const conv = r.conversations as any;
    const last = latestMsg.get(conv.id);
    return {
      id: conv.id,
      type: conv.type,
      name: conv.name || "",
      last_message: last?.content?.slice(0, 100),
      last_message_at: last?.created_at,
      member_count: memberCount.get(conv.id) || 1,
      created_at: conv.created_at,
    };
  });

  return { success: true, data: conversations };
}

export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<{ success: boolean; data?: ConversationMessage[]; error?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, conversation_id, sender_id, content, created_at, users!inner(pseudo)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data as any[]).map((m) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      sender_pseudo: (m.users as any).pseudo,
      content: m.content,
      created_at: m.created_at,
    })),
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ success: boolean; error?: string; message_id?: number }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content: content.trim() })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, message_id: (data as { id: number }).id };
}

export async function findOrCreateDirectConversation(
  userId1: string,
  targetPseudo: string
): Promise<{ success: boolean; conversation_id?: string; error?: string }> {
  const supabase = getSupabaseClient();

  // Find target user
  const { data: target } = await supabase
    .from("users")
    .select("id")
    .eq("pseudo", targetPseudo.trim())
    .maybeSingle();

  if (!target) return { success: false, error: `User "${targetPseudo}" not found` };

  const userId2 = target.id;

  // Check if direct conversation already exists between these two users
  const { data: existing } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId1);

  const user1ConvIds = existing?.map((r: any) => r.conversation_id) || [];

  if (user1ConvIds.length > 0) {
    const { data: mutual } = await supabase
      .from("conversation_members")
      .select("conversation_id, conversations!inner(type)")
      .in("conversation_id", user1ConvIds)
      .eq("user_id", userId2)
      .eq("conversations.type", "direct")
      .maybeSingle();

    if (mutual) {
      return { success: true, conversation_id: mutual.conversation_id };
    }
  }

  // Create new direct conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type: "direct" })
    .select("id")
    .single();

  if (convErr) return { success: false, error: convErr.message };

  // Add both members
  await supabase.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: userId1 },
    { conversation_id: conv.id, user_id: userId2 },
  ]);

  return { success: true, conversation_id: conv.id };
}

export async function createGroupConversation(
  creatorId: string,
  memberPseudos: string[],
  name?: string
): Promise<{ success: boolean; conversation_id?: string; error?: string }> {
  const supabase = getSupabaseClient();

  if (memberPseudos.length > 9) {
    return { success: false, error: "Maximum 10 users per group (including you)" };
  }

  // Find all users
  const { data: users } = await supabase
    .from("users")
    .select("id, pseudo")
    .in("pseudo", memberPseudos.map((p) => p.trim()));

  if (!users || users.length !== memberPseudos.length) {
    const found = users?.map((u: any) => u.pseudo) || [];
    const missing = memberPseudos.filter((p) => !found.includes(p.trim()));
    return { success: false, error: `Users not found: ${missing.join(", ")}` };
  }

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type: "group", name: name?.trim() || "" })
    .select("id")
    .single();

  if (convErr) return { success: false, error: convErr.message };

  const members = [{ conversation_id: conv.id, user_id: creatorId }];
  for (const u of users) {
    if ((u as any).id !== creatorId) {
      members.push({ conversation_id: conv.id, user_id: (u as any).id });
    }
  }

  const { error: memErr } = await supabase.from("conversation_members").insert(members);
  if (memErr) return { success: false, error: memErr.message };

  return { success: true, conversation_id: conv.id };
}

export async function addToConversation(
  conversationId: string,
  pseudos: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const { data: users } = await supabase
    .from("users")
    .select("id")
    .in("pseudo", pseudos.map((p) => p.trim()));

  if (!users || users.length !== pseudos.length) {
    return { success: false, error: "One or more users not found" };
  }

  const { error } = await supabase.from("conversation_members").upsert(
    users.map((u: any) => ({ conversation_id: conversationId, user_id: u.id })),
    { onConflict: "conversation_id, user_id", ignoreDuplicates: true }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

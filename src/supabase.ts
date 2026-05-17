import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

let _supabase: SupabaseClient | null = null;

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_KEY ?? "";
  return { url, key };
}

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      throw new Error(
        "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_KEY environment variables."
      );
    }
    _supabase = createClient(url, key, { realtime: { transport: ws } });
  }
  return _supabase;
}

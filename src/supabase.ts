import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

let _supabase: SupabaseClient | null = null;

// Public anon key — safe to embed. Only allows SELECT via RLS.
// Override via SUPABASE_URL / SUPABASE_KEY env vars if needed.
const DEFAULT_SUPABASE_URL = "https://gvkljtwhsulzdpsapaau.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2a2xqdHdoc3VsemRwc2FwYWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzQ3MTUsImV4cCI6MjA5NDUxMDcxNX0.AdZ6nW9ClSa-HHqND7vuTYj1Vh6YEta5LX86ep8qcQ4";

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
    const key = process.env.SUPABASE_KEY ?? process.env.SUPABASE_ANON ?? DEFAULT_SUPABASE_KEY;
    _supabase = createClient(url, key, { realtime: { transport: ws } });
  }
  return _supabase;
}

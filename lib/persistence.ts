import "server-only";

import { isSupabaseConfigured } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export interface PersistContext {
  user_id: string;
  supabase: SupabaseServerClient;
}

/**
 * Returns a write-ready context iff:
 *   1. Supabase env is filled in (URL + anon key), AND
 *   2. The current request has a valid auth.users session cookie.
 *
 * Returns null otherwise. NEVER throws — every callsite can safely do:
 *
 *   const ctx = await getPersistContext();
 *   if (!ctx) return stateless_response;
 *   // ...ctx.supabase.from('...').insert(...)
 *
 * This shape is what lets every AI route stay end-to-end usable before
 * Supabase is provisioned (Day 7) and light up automatically after (Day 8+).
 */
export async function getPersistContext(): Promise<PersistContext | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { user_id: data.user.id, supabase };
  } catch (err) {
    console.warn("[persistence] getPersistContext threw:", err);
    return null;
  }
}

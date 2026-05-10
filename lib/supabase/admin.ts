import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. NEVER expose to client; never import from a "use client" file.
 * Use only in API routes, server actions, and trusted server-side jobs.
 */
export function createSupabaseAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("[linkao] SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

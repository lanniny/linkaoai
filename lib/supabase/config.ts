/**
 * Single source of truth for "is Supabase reachable right now".
 * All auth/persistence callers MUST check this first — if false, fall back
 * to stateless behavior (no DB writes, no session checks, no redirects).
 * This lets the app run end-to-end before/without a Supabase project,
 * and lights up automatically the moment the founder fills .env.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && anonKey && url.length > 0 && anonKey.length > 0);
}

/**
 * Server-side strict check — includes service_role for admin operations.
 */
export function isSupabaseAdminConfigured(): boolean {
  return (
    isSupabaseConfigured() &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0
  );
}

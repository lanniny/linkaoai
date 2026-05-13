import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db, type DB } from "@/lib/db";

export interface PersistContext {
  user_id: string;
  db: DB;
}

/**
 * Returns a write-ready context iff the current request has a valid
 * better-auth session cookie.
 *
 * Returns null otherwise. NEVER throws — every callsite can safely do:
 *
 *   const ctx = await getPersistContext();
 *   if (!ctx) return stateless_response;
 *   // ...ctx.db.insert(...)
 *
 * Drizzle + SQLite is always available in this stack (no "configured?" check
 * needed), so the only failure mode is "no session". Logged-out callers
 * still get a stateless run.
 */
export async function getPersistContext(): Promise<PersistContext | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    return { user_id: session.user.id, db };
  } catch (err) {
    console.warn("[persistence] getPersistContext threw:", err);
    return null;
  }
}

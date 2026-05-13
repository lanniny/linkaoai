import type { User } from "@supabase/supabase-js";

/**
 * Role convention (mirrors new-api semantics):
 * - 0  : common user (default if missing)
 * - 1  : admin       (can manage users / orders / codes)
 * - 10 : root admin  (additionally can promote other admins, immune to demotion)
 *
 * Source of truth = Supabase `auth.users.app_metadata.role` (numeric).
 * ROOT_ADMIN_EMAIL in .env is a bootstrap fallback so the first deploy can log in
 * even before app_metadata is set.
 */

export type Role = 0 | 1 | 10;

const ROOT_EMAIL =
  (process.env.ROOT_ADMIN_EMAIL ?? "").trim().toLowerCase() || null;

export function getUserRole(user: User | null | undefined): Role {
  if (!user) return 0;
  const raw = user.app_metadata?.role;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 10) return 10;
  if (n >= 1) return 1;
  // Bootstrap: ROOT_ADMIN_EMAIL is always treated as root, even if metadata
  // was never set (covers first-ever deploy).
  if (ROOT_EMAIL && user.email && user.email.toLowerCase() === ROOT_EMAIL) {
    return 10;
  }
  return 0;
}

export function isAdmin(user: User | null | undefined): boolean {
  return getUserRole(user) >= 1;
}

export function isRootAdmin(user: User | null | undefined): boolean {
  return getUserRole(user) >= 10;
}

export function roleLabel(role: Role): string {
  if (role === 10) return "Root";
  if (role === 1) return "Admin";
  return "User";
}

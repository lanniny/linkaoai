/**
 * Role convention (mirrors new-api semantics):
 * - 0  : common user (default if missing)
 * - 1  : admin       (can manage users / orders / codes)
 * - 10 : root admin  (additionally can promote other admins, immune to demotion)
 *
 * Source of truth = better-auth `user.role` (numeric column on the user table).
 * ROOT_ADMIN_EMAIL in .env is a bootstrap fallback so the first deploy can log in
 * even before any user.role has been set.
 *
 * This helper is intentionally provider-agnostic: it accepts any object with
 * an optional `email` and optional `role` (or `app_metadata.role` for legacy
 * Supabase users while the migration is in flight).
 */

export type Role = 0 | 1 | 10;

export interface RoleUser {
  email?: string | null | undefined;
  role?: number | unknown;
  // Legacy Supabase shape — supported until Phase 5 finishes.
  app_metadata?: { role?: number | unknown } | null | undefined;
}

const ROOT_EMAIL =
  (process.env.ROOT_ADMIN_EMAIL ?? "").trim().toLowerCase() || null;

function normalizeRole(raw: unknown): Role | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n >= 10) return 10;
  if (n >= 1) return 1;
  if (n <= 0) return 0;
  return null;
}

export function getUserRole(user: RoleUser | null | undefined): Role {
  if (!user) return 0;
  // Prefer the new direct `user.role` (better-auth);
  // fall back to legacy Supabase `app_metadata.role` during migration.
  const fromDirect = normalizeRole(user.role);
  if (fromDirect !== null) return fromDirect;
  const fromMeta = normalizeRole(user.app_metadata?.role);
  if (fromMeta !== null && fromMeta > 0) return fromMeta;

  // Bootstrap fallback: ROOT_ADMIN_EMAIL is always treated as root.
  if (ROOT_EMAIL && user.email && user.email.toLowerCase() === ROOT_EMAIL) {
    return 10;
  }
  return fromMeta ?? 0;
}

export function isAdmin(user: RoleUser | null | undefined): boolean {
  return getUserRole(user) >= 1;
}

export function isRootAdmin(user: RoleUser | null | undefined): boolean {
  return getUserRole(user) >= 10;
}

export function roleLabel(role: Role): string {
  if (role === 10) return "Root";
  if (role === 1) return "Admin";
  return "User";
}

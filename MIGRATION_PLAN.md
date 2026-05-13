# Linkao · Supabase → SQLite + drizzle + better-auth Migration Plan

**Started**: 2026-05-13 (Day 9 cont.)
**Trigger**: Founder no longer wants to depend on Supabase.
**Final stack**: SQLite (better-sqlite3) + drizzle-orm + better-auth (email/password).
**Data migration**: **None** — start fresh; current Supabase project will be abandoned.

---

## Phase Tracker

| Phase | Title | Status | Files |
|-------|-------|--------|-------|
| 1 | Foundation: deps + schema + auth scaffold | ✅ shipped | 5 new |
| 2 | Replace auth pages + console layout | ⏳ pending | ~5 modified |
| 3 | Replace console user + admin pages | ⏳ pending | ~13 modified |
| 4 | Replace API routes + lib helpers | ⏳ pending | ~20 modified |
| 5 | Remove Supabase remnants | ⏳ pending | ~10 deleted |
| 6 | Deploy + SQLite migrate on server | ⏳ pending | env + ssh |

## Phase 1 · Foundation (this commit)

**Installed**:
- `drizzle-orm` 0.45.2
- `drizzle-kit` 0.31.10 (dev)
- `better-sqlite3` 12.10.0 (+ types)
- `better-auth` 1.6.11

**Native build**: `better-sqlite3` allow-listed in `pnpm.onlyBuiltDependencies` so
`pnpm install --ignore-scripts` still produces a working binary via
`prebuild-install`.

**New files**:
- `drizzle.config.ts` — drizzle-kit config pointing at `lib/db/schema.ts`,
  outputs migrations to `drizzle/`.
- `lib/db/index.ts` — singleton drizzle client over `better-sqlite3`. Reads
  `DATABASE_URL=file:./data/linkao.db` (default), enables WAL + foreign keys,
  auto-creates the parent dir.
- `lib/db/schema.ts` — 17 tables total:
  - **better-auth core** (4): `user`, `session`, `account`, `verification`
  - **Linkao domain** (8): `courses`, `knowledge_points`, `questions`,
    `attempts`, `weakness_points`, `sprint_plans`, `payments`,
    `redemption_codes`
  - **new-api mirror** (5): `personal_access_tokens`, `usage_counters`,
    `ai_channels`, `ai_usage_logs`, `system_settings`
  - `user.role` extension column (0 / 1 / 10) replaces Supabase
    `app_metadata.role`.
- `lib/auth.ts` — `betterAuth(...)` instance with drizzleAdapter,
  email+password, 30-day sessions, role additional field, trustedOrigins
  list including `https://linkaoai.com`.
- `lib/auth-client.ts` — `createAuthClient(...)` for client components.
- `app/api/auth/[...all]/route.ts` — better-auth Next.js handler.

**Required env additions** (Phase 6 will set these on the server):
- `DATABASE_URL=file:./data/linkao.db`
- `BETTER_AUTH_SECRET=<32+ char random>`
- `BETTER_AUTH_URL=https://linkaoai.com` (prod) / `http://localhost:3000` (dev)

**Removable env after Phase 5**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ROOT_ADMIN_EMAIL` (kept — used by `lib/admin.ts` as root bootstrap)

## Phase 2 · Auth pages + console layout

**To modify**:
- `app/login/page.tsx` — replace `createSupabaseBrowserClient()` with
  `authClient.signIn.email`. Drop the magic-link tab (or wire it later via
  the magicLink plugin).
- `app/register/page.tsx` — replace `supabase.auth.signUp` with
  `authClient.signUp.email`.
- `app/auth/callback/route.ts` — delete (better-auth has no email-link
  callback for password-only).
- `app/auth/signout/route.ts` — replace `supabase.auth.signOut` with
  `auth.api.signOut`.
- `app/console/layout.tsx` — replace `createSupabaseServerClient` +
  `getUser` with `auth.api.getSession({ headers: await headers() })`.

## Phase 3 · Console pages (user + admin)

**User pages**:
- `/console/page.tsx` (overview)
- `/console/courses/page.tsx`
- `/console/practice/page.tsx`  (client component — uses fetch only, no
  direct DB; should still compile after Phase 2)
- `/console/history/page.tsx`
- `/console/history/[id]/page.tsx`
- `/console/sprint/page.tsx`
- `/console/billing/page.tsx`
- `/console/settings/page.tsx`

**Admin pages**:
- `/console/admin/layout.tsx`
- `/console/admin/page.tsx`
- `/console/admin/users/page.tsx`
- `/console/admin/orders/page.tsx`
- `/console/admin/codes/page.tsx`
- `/console/admin/logs/page.tsx`
- `/console/admin/settings/page.tsx`

All `supabase.from(X).select(...)` calls become `db.query.X.findMany(...)`
or `db.select(...).from(X)` with drizzle.

## Phase 4 · API routes + lib helpers

**API routes** (17):
- `/api/extract` — write courses + knowledge_points via drizzle txn
- `/api/generate-questions` — write questions
- `/api/grade` — write attempts + weakness_points upsert
- `/api/sprint-plan` — write sprint_plans
- `/api/payment/intent` — write pending payment
- `/api/payment/epay/create` — read pending → build signed URL
- `/api/payment/epay/notify` — flip pending → paid (server-to-server)
- `/api/payment/epay/return` — verify sig + redirect
- `/api/redemption/redeem` — atomic CAS (active → used) + insert paid payment
- `/api/admin/users/[id]/role` — update `user.role`
- `/api/admin/payments/[id]/mark-paid` — flip status → paid
- `/api/admin/codes/generate` — bulk insert redemption codes
- `/api/admin/settings` — upsert system_settings
- `/api/auth/[...all]` — better-auth handler (already added)

**Lib helpers**:
- `lib/persistence.ts` — drop Supabase ctx; export `getDbContext()` that
  returns `{ db, user }` or `null` based on better-auth session.
- `lib/admin.ts` — read `user.role` from better-auth session user; keep
  `ROOT_ADMIN_EMAIL` bootstrap.
- `lib/ai-usage.ts` — replace admin client with `db.insert(aiUsageLogs)`.
- `lib/system-settings.ts` — replace admin client with `db.query.systemSettings`.

## Phase 5 · Remove Supabase remnants

**Delete**:
- `lib/supabase/` (4 files)
- `supabase/migrations/0001` through `0004` (only `0004` is for the
  abandoned cloud; keep in git history but stop running on prod)
- `app/auth/callback/` if Phase 2 removed it
- env keys (see above)
- `pnpm remove @supabase/ssr @supabase/supabase-js`

**Audit**:
- `grep -r supabase` should return zero hits (except in
  `outputs/runtime/vibe-sessions/*` archives).
- `grep -r createSupabase` should return zero hits.

## Phase 6 · Deploy

**On wai-195** (`ssh skill`):
- `mkdir -p /opt/linkao/data && chown linkao:linkao /opt/linkao/data`
- `/opt/linkao/.env.production`:
  - add `DATABASE_URL=file:./data/linkao.db`
  - add `BETTER_AUTH_SECRET=$(openssl rand -hex 32)`
  - add `BETTER_AUTH_URL=https://linkaoai.com`
  - remove `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`
- `cd /opt/linkao && pnpm drizzle-kit push` (creates the schema)
- `pm2 restart linkao --update-env`

**Verify**:
- `curl -sI https://linkaoai.com/` → 200
- Register a fresh account at `/register`
- Promote that user to root via SQL: `UPDATE user SET role = 10 WHERE email = '<founder>'`
  (or via `ROOT_ADMIN_EMAIL` bootstrap)
- Open `/console/admin` → should render
- Click through each admin page

**Rollback** (if something is on fire):
- `pm2 logs linkao --lines 100` to see actual error
- The `/opt/linkao/data/linkao.db` is the entire state. Back up before
  redeploying.

## Non-goals during this migration

- Migrating existing Supabase data (founder approved fresh start).
- Adding OAuth providers (email+password only for now; can add Google /
  GitHub via better-auth plugins later).
- Multi-tenant / org features.
- Switching payment provider away from EPay+manual+redemption.

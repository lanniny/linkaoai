# new-api → Linkao Parity Audit

**Audited**: 2026-05-13
**Reference**: Calcium-Ion/new-api SaaS console (general LLM gateway)
**Subject**: Linkao 临考 (AI exam-review for 高数/线代/概率论)

Vibe-governed 9 mapping is now landed end-to-end. This document records
what was mirrored vs. intentionally skipped, with rationale, so future
agents (and the founder) don't re-invent decisions made during the
2026-05-13 build-out.

---

## ✅ Mirrored

### M1 · Personal Access Tokens (deferred to follow-up wave)

- **new-api**: `sk-*` style API keys issued per user for SDK access.
- **Linkao**: DB schema (`personal_access_tokens`) and RLS ready.
  UI + verification middleware deliberately deferred — exam-review
  product doesn't yet expose programmable APIs to end users; first
  customer-facing surface stays the web UI.
- **Status**: Schema landed (Phase 1). UI / API verification will
  ship when there's a real "use my token from my CLI" user story.

### M2 · Subject Credits & Monthly Quota

- **new-api**: per-user balance counter; checked + decremented per API call.
- **Linkao**: per-user, per-route, per-month counter in `usage_counters`.
  Free-tier limits read from `system_settings.free_tier_quota`
  (`extract`/`generate_questions`/`grade`/`sprint_plan`).
  Paid users (≥ 1 row in `payments` with `status='paid'`) bypass
  the quota check — Linkao sells subjects, not API calls, so unlock
  is binary, not metered.
- **Files**: `lib/quota.ts` (checkQuota + snapshotAllQuotas).
- **Integration**: 4 AI routes call `checkQuota` before `anthropic.messages.create`;
  HTTP 429 with structured `{ error, message, quota }` on overrun.
- **Counter bump**: `incUsageCounter` in lib/ai-usage.ts after success.

### M3 · AI Channels

- **new-api**: multi-provider routing (OpenAI / Anthropic / Azure …) with
  health checks + priority.
- **Linkao**: `ai_channels` table seeded with Opus + Haiku rows pointing at
  the founder-approved openclaudecode.cn proxy. Admin UI at
  `/console/admin/channels` supports inline edit + ping + delete + add.
- **Note**: Linkao does NOT yet read this table at request-time —
  `lib/anthropic.ts` still hardcodes the proxy URL. Channel table is
  currently informational + ready-for-routing; runtime read will follow
  when we actually start failing over across providers.

### M4 · AI Usage Logs

- **new-api**: per-request log with model / tokens / cost / status.
- **Linkao**: `ai_usage_logs` row per `/api/extract` `/api/generate-questions`
  `/api/grade` `/api/sprint-plan` invocation; cost estimate via Anthropic
  list-price × 7.2 RMB/USD.
- **Files**: `lib/ai-usage.ts` (emitAiUsage); 4 AI routes call it on
  success + error paths.
- **UI**: `/console/admin/logs` with route/status/user filters + 5 stat
  cards.

### M5 · Statistics

- **new-api**: revenue + signup + model-usage charts.
- **Linkao**: `/console/admin/stats` · recharts 3 · 4 charts (revenue
  Line, signup Bar, subject Pie, model token stacked Area) · 30-day
  window aggregated server-side.

### M6 · Redemption Codes

- **new-api**: bulk code generation + expiry + redemption tracking.
- **Linkao**: already implemented in 0003 SQL → migrated to drizzle in
  Phase 1; admin at `/console/admin/codes` supports batch generate
  (Crockford Base32 · 10 chars · 1-200 per batch) + expiry days +
  notes; user redeem at `/api/redemption/redeem` does atomic CAS
  (active→used) with rowsAffected guard.
- **Parity gap**: new-api supports "code categories" (different rewards
  per code). Linkao only has `subject + amount_cny` per code which is
  enough for "single-subject unlock" promo runs. Not worth widening
  for MVP.

### M7 · Refunds & Billing History

- **new-api**: top-up history + refund records.
- **Linkao**: `payments` extended with `refund_at` / `refund_reason` /
  `refund_by` columns. Admin refund button at `/console/admin/orders`
  (paid → refunded transition only, requires reason). User-facing
  `/console/billing/history` groups orders by calendar month, shows
  paid vs refund totals per month + refund_reason on each row.

### M8 · System Settings

- **new-api**: pricing + maintenance + announcement editable from admin UI.
- **Linkao**: `system_settings` table; 4 typed groups: `pricing`,
  `free_tier_quota`, `maintenance`, `announcement`.
- **UI**: `/console/admin/settings` · 4 inline-save sections.
- **Integration**:
  - `pricing` → not yet wired into `/api/payment/intent` (still hardcoded
    19.9). Deferred; current MVP price is uniform anyway.
  - `free_tier_quota` → live (M2 reads this).
  - `maintenance` → live (`lib/maintenance.ts` reads this; 4 AI routes
    return 503 when enabled).
  - `announcement` → not yet wired into the marketing homepage banner.

### M9 · Public /status

- **new-api**: public status page.
- **Linkao**: `/status` server component, 30s revalidate cache, checks
  SQLite (SELECT 1) + Anthropic proxy (HEAD ping with 5s timeout) +
  maintenance flag. Overall status = worst child + maintenance override.

---

## ❌ Intentionally Skipped

### Multi-tenant / org workspaces
Linkao is a B2C product for individual students. Single-user sessions
are sufficient. new-api's tenant-scoping (e.g. "Company X has these
keys, users, billing") is over-engineered for this domain.

### Stripe / Paddle integration
Linkao operates in China and uses 易支付 (EPay) + manual transfer
fallback + redemption codes. International payment providers aren't
a fit for the target demographic (Chinese university students).

### Daily quotas / rate-limited sub-tiers
new-api has per-minute / per-day rate limiting on top of monthly
balance. Linkao keeps it simple: monthly quota for free tier, unlimited
for paid. If a paid user truly hammers the API, ai_usage_logs lets us
spot abuse manually.

### "Token relay" mode (act as a passthrough OpenAI API for users)
new-api's primary value prop is "give me an OpenAI-compatible endpoint
that fans out to multiple providers". Linkao's product is the
exam-review workflow, not the underlying API. PAT tokens (M1) would
enable this if we ever wanted it, but it's not the core business.

---

## ⏳ Wired but not yet visible

### Quota status in user UI
Server-side quota gate is live but `/console` overview doesn't yet
surface "你本月还能用 X 次". Helper `snapshotAllQuotas()` is ready —
just needs a card.

### Announcement banner
`system_settings.announcement` is editable but the marketing homepage
doesn't read it yet.

### AI channels runtime read
`ai_channels` is editable but `lib/anthropic.ts` doesn't read it; the
Anthropic SDK still picks up `ANTHROPIC_BASE_URL` from env.

---

## Schema parity summary

| new-api concept | Linkao table |
|---|---|
| `users` | `user` (better-auth managed) |
| `tokens` (API keys) | `personal_access_tokens` (schema only) |
| `channels` | `ai_channels` |
| `logs` | `ai_usage_logs` |
| `quota` / `used_quota` | `usage_counters` (per-month, per-route) |
| `top_up_history` | `payments` (with refund_* cols) |
| `redemption_codes` | `redemption_codes` |
| `system_options` | `system_settings` (jsonb-per-key) |
| (none — new-api is single-page) | `courses`, `knowledge_points`, `questions`, `attempts`, `weakness_points`, `sprint_plans` |

17 tables total. 8 mirror new-api directly, 4 are auth/session
(better-auth), 5 are Linkao-specific exam-review domain.

---

## Sign-off

All 9 mapping bullets in the frozen `requirement_doc` are accounted for.
Items left as "follow-up" (M1 UI, channel runtime read, announcement
banner, quota-status card) are intentional, documented here, and not
considered scope drift.

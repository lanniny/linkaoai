import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db, payments, usageCounters } from "@/lib/db";
import { readSetting } from "@/lib/system-settings";

/**
 * M2 mirror · Subject Credits monthly quota gate.
 *
 * Rules (mirrors new-api logic, adapted to Linkao):
 * - Paid users (have at least one payments row with status='paid') are
 *   considered unlocked and bypass the free-tier limit entirely.
 * - Unpaid users get a per-route, per-calendar-month allowance read from
 *   system_settings.free_tier_quota.
 * - Setting a quota to 0 effectively bans the free tier for that route.
 * - The counter itself is bumped in lib/ai-usage.ts after a successful call,
 *   so usage = "how many successful runs this month".
 */

export type QuotaKind = "extract" | "generate_questions" | "grade" | "sprint_plan";

export interface QuotaStatus {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  isPaid: boolean;
}

function currentMonthYmd(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Returns quota status without consuming. Use this to decide whether to
 * proceed with an expensive AI call. The actual counter bump happens via
 * incUsageCounter() in lib/ai-usage.ts after the call succeeds.
 */
export async function checkQuota(
  userId: string | null,
  kind: QuotaKind,
): Promise<QuotaStatus> {
  // Anonymous calls: there's nothing to count or enforce — let them through.
  // Logged-out flows are the discoverability path; persistence simply skips.
  if (!userId) {
    return {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      isPaid: false,
    };
  }

  // Paid bypass: any prior 'paid' payment row is enough to lift the free
  // tier for this user across all subjects + all routes.
  const paid = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.status, "paid")))
    .limit(1);
  const isPaid = paid.length > 0;
  if (isPaid) {
    return {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      isPaid: true,
    };
  }

  // Free tier — read setting + current counter.
  const quotaCfg = await readSetting("free_tier_quota");
  const limit = quotaCfg[kind] ?? 0;

  const monthYmd = currentMonthYmd();
  const [counter] = await db
    .select({ usedN: usageCounters.usedN })
    .from(usageCounters)
    .where(
      and(
        eq(usageCounters.userId, userId),
        eq(usageCounters.monthYmd, monthYmd),
        eq(usageCounters.kind, kind),
      ),
    )
    .limit(1);
  const used = counter?.usedN ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
    isPaid: false,
  };
}

/**
 * Snapshot of ALL routes' quota status for a user. Used by /console
 * overview to show "你本月还能用 X 次" before the user clicks anything.
 */
export async function snapshotAllQuotas(
  userId: string | null,
): Promise<Record<QuotaKind, QuotaStatus>> {
  const kinds: QuotaKind[] = [
    "extract",
    "generate_questions",
    "grade",
    "sprint_plan",
  ];
  if (!userId) {
    const inf = {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      isPaid: false,
    } as QuotaStatus;
    return Object.fromEntries(kinds.map((k) => [k, inf])) as Record<
      QuotaKind,
      QuotaStatus
    >;
  }

  // Single round-trip for paid check + counters.
  const [paidRow] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.status, "paid")))
    .limit(1);
  const isPaid = !!paidRow;
  if (isPaid) {
    const v: QuotaStatus = {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      isPaid: true,
    };
    return Object.fromEntries(kinds.map((k) => [k, v])) as Record<
      QuotaKind,
      QuotaStatus
    >;
  }

  const quotaCfg = await readSetting("free_tier_quota");
  const monthYmd = currentMonthYmd();
  const counters = await db
    .select({ kind: usageCounters.kind, usedN: usageCounters.usedN })
    .from(usageCounters)
    .where(
      and(
        eq(usageCounters.userId, userId),
        eq(usageCounters.monthYmd, monthYmd),
        inArray(usageCounters.kind, kinds),
      ),
    );
  const usedMap = new Map<string, number>();
  for (const c of counters) usedMap.set(c.kind, c.usedN);

  const result = {} as Record<QuotaKind, QuotaStatus>;
  for (const k of kinds) {
    const limit = quotaCfg[k] ?? 0;
    const used = usedMap.get(k) ?? 0;
    result[k] = {
      allowed: used < limit,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      isPaid: false,
    };
  }
  return result;
}

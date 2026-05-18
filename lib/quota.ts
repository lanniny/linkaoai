import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db, usageCounters } from "@/lib/db";
import {
  type EffectivePlan,
  PLAN_LIMITS,
  getUserPlan,
} from "@/lib/subscription";
import { readSetting } from "@/lib/system-settings";

/**
 * M2 mirror · 月配额 + 订阅级 limit。
 *
 * 演进自最初的 paid 永久 bypass 模型 — 现在支持 Free/Plus/Pro 三档：
 *
 *   plan         | extract | gen | grade | sprint | bypass
 *   -------------+---------+-----+-------+--------+--------
 *   free         |    1    |  20 |   60  |    3   |  no
 *   plus         |    5    | 100 |  300  |   10   |  no
 *   pro          |   inf   | inf |   inf |  inf   |  yes
 *   legacy_lifetime (单科 19.9 老用户) | inf | inf | inf | inf | yes
 *
 * Free 配额仍然支持 admin 通过 system_settings.free_tier_quota 调整（兼容旧逻辑）。
 * Plus 配额来自 PLAN_LIMITS.plus 常量 — 暂时硬编码不暴露给 admin，因为 Plus
 * 是个商业承诺数字，不该被 UI 随手改。
 */

export type QuotaKind = "extract" | "generate_questions" | "grade" | "sprint_plan";

export interface QuotaStatus {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  /** 旧字段保留兼容；新代码用 plan 字段判断更精确。 */
  isPaid: boolean;
  /** 用户当前生效的 plan（free/plus/pro/legacy_lifetime）。 */
  plan: EffectivePlan;
}

function currentMonthYmd(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function unlimitedStatus(plan: EffectivePlan): QuotaStatus {
  return {
    allowed: true,
    limit: Infinity,
    used: 0,
    remaining: Infinity,
    isPaid: plan === "pro" || plan === "legacy_lifetime",
    plan,
  };
}

/**
 * 给定 plan，返回该 plan 对该 route 的 limit。Free 走 admin 可调的
 * free_tier_quota；Plus 走硬编码的 PLAN_LIMITS.plus。
 */
async function planLimitFor(
  plan: EffectivePlan,
  kind: QuotaKind,
): Promise<number | "unlimited"> {
  if (plan === "pro" || plan === "legacy_lifetime") return "unlimited";
  if (plan === "plus") return PLAN_LIMITS.plus[kind];
  // free
  const freeCfg = await readSetting("free_tier_quota");
  return freeCfg[kind] ?? 0;
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
      plan: "free",
    };
  }

  const plan = await getUserPlan(userId);

  // Pro / legacy_lifetime → unlimited bypass
  const limitOrInf = await planLimitFor(plan, kind);
  if (limitOrInf === "unlimited") return unlimitedStatus(plan);

  // Free / Plus → 实际查计数器
  const limit = limitOrInf;
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
    plan,
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
    const inf: QuotaStatus = {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      isPaid: false,
      plan: "free",
    };
    return Object.fromEntries(kinds.map((k) => [k, inf])) as Record<
      QuotaKind,
      QuotaStatus
    >;
  }

  const plan = await getUserPlan(userId);

  // Pro / legacy_lifetime → 全部 unlimited，一次返回即可
  if (plan === "pro" || plan === "legacy_lifetime") {
    const v = unlimitedStatus(plan);
    return Object.fromEntries(kinds.map((k) => [k, v])) as Record<
      QuotaKind,
      QuotaStatus
    >;
  }

  // Free / Plus → 单次拉 counters 后按 plan 计算 limit
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

  const freeCfg = plan === "free" ? await readSetting("free_tier_quota") : null;

  const result = {} as Record<QuotaKind, QuotaStatus>;
  for (const k of kinds) {
    const limit =
      plan === "plus" ? PLAN_LIMITS.plus[k] : (freeCfg?.[k] ?? 0);
    const used = usedMap.get(k) ?? 0;
    result[k] = {
      allowed: used < limit,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      isPaid: false,
      plan,
    };
  }
  return result;
}

import "server-only";

import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { db, payments, subscriptions } from "@/lib/db";

/**
 * Free / Plus / Pro 三档订阅 + 旧版单科一次性永久权益。
 *
 * 决策表（实际生效的 plan）：
 *   1. 任一 payments 行 status='paid' AND plan IS NULL → "legacy_lifetime"
 *      （早期 19.9 单科永久买断的老用户；保留 unlimited 等同 pro）
 *   2. 任一 active 订阅 plan='pro' AND period_end > now → "pro"
 *   3. 任一 active 订阅 plan='plus' AND period_end > now → "plus"
 *   4. 否则 → "free"
 *
 * pro > plus > free 的优先级在 getUserPlan() 里实现 — 同时持有多个订阅时取
 * 最高档。legacy_lifetime 在 quota 上视作 pro（功能等价），但 console UI
 * 可以单独标识"早期支持者"以表达感谢。
 */

export type Plan = "free" | "plus" | "pro";
export type EffectivePlan = Plan | "legacy_lifetime";

export interface PlanLimits {
  extract: number;
  generate_questions: number;
  grade: number;
  sprint_plan: number;
}

/**
 * 每月配额上限。Pro / legacy_lifetime 走 unlimited 不读这个表（lib/quota.ts
 * 直接 bypass），所以这里只列 free / plus 的数字。
 *
 * 配额跟 2026-05-19 主人对齐的"学生友好方案"一致：
 * - Free: 1/20/60/3（够试用一次完整流程）
 * - Plus: 5/100/300/10（够日常练习 + 三学科全开）
 * - Pro:  unlimited + 90 天历史 + 模拟卷优先 Opus
 */
export const PLAN_LIMITS: Record<"free" | "plus", PlanLimits> = {
  free: { extract: 1, generate_questions: 20, grade: 60, sprint_plan: 3 },
  plus: { extract: 5, generate_questions: 100, grade: 300, sprint_plan: 10 },
};

/** 月订阅价格（CNY）。Pro/Plus 月卡固定价。 */
export const PLAN_PRICE_CNY: Record<"plus" | "pro", number> = {
  plus: 9.9,
  pro: 19.9,
};

/**
 * 年付价格。仅 Pro 支持年付 — Plus 是入门档不引导年付（学生现金流敏感）。
 * 199 / 12 ≈ ¥16.6，月卡 ¥19.9 相比节省约 17%（约两个月免费）。年付用户
 * 才适用挂科退款政策，做差异化承诺。
 */
export const PLAN_YEARLY_PRICE_CNY: Record<"pro", number> = {
  pro: 199,
};

export const PLAN_PERIOD_DAYS = 30;
export const PLAN_YEARLY_PERIOD_DAYS = 365;

/**
 * 付款成功 → 创建/延期一行 active 订阅。三个入口共享：epay/notify、
 * admin mark-paid、redemption/redeem。
 *
 * 续费语义：用户已有同 plan 的 active 行 → period_end += periodDays 天
 * （延长），不创建新行；否则新建 active 行 period_start=now / period_end=
 * now+periodDays.
 *
 * periodDays 默认 30 天（月付）；Pro 年付传 365。
 *
 * Fire-and-forget：调用方不应该让订阅创建失败阻塞 payment status 更新；
 * 实际错误已 log，下次调用还会幂等延期。
 */
export async function issueSubscriptionFromPayment(args: {
  paymentId: string;
  userId: string;
  plan: "plus" | "pro";
  periodDays?: number;
}): Promise<void> {
  const now = new Date();
  const periodDays = args.periodDays ?? PLAN_PERIOD_DAYS;
  const periodMs = periodDays * 86400_000;

  try {
    // 找用户当前同 plan 的 active 行（最长 period_end 那条）
    const [existing] = await db
      .select({
        id: subscriptions.id,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, args.userId),
          eq(subscriptions.plan, args.plan),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(1);

    if (existing && existing.currentPeriodEnd > now) {
      // 延期：从原 period_end 继续 +30 天，让用户不丢秒
      const extendedEnd = new Date(
        existing.currentPeriodEnd.getTime() + periodMs,
      );
      await db
        .update(subscriptions)
        .set({ currentPeriodEnd: extendedEnd })
        .where(eq(subscriptions.id, existing.id));
      return;
    }

    // 新订阅 / 之前过期 → 新建一行 active
    await db.insert(subscriptions).values({
      userId: args.userId,
      plan: args.plan,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + periodMs),
      paymentId: args.paymentId,
    });
  } catch (err) {
    console.warn(
      "[subscription] issueSubscriptionFromPayment failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * 返回某用户当前生效的 plan。匿名调用（userId=null）总是 'free'。
 */
export async function getUserPlan(
  userId: string | null,
): Promise<EffectivePlan> {
  if (!userId) return "free";

  // 1. 旧版单科永久买断：payments.status='paid' AND plan IS NULL（plan 字段
  //    在订阅版本上线时新增，老 row 都是 NULL）
  const [legacy] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.status, "paid"),
        isNull(payments.plan),
      ),
    )
    .limit(1);
  if (legacy) return "legacy_lifetime";

  // 2. 现行订阅 — 取最长 period_end 的 active 行，按 plan 优先级排序
  const now = new Date();
  const activeSubs = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, now),
      ),
    )
    .orderBy(desc(subscriptions.currentPeriodEnd));

  if (activeSubs.some((s) => s.plan === "pro")) return "pro";
  if (activeSubs.some((s) => s.plan === "plus")) return "plus";

  return "free";
}

/**
 * 拿到某用户当前 active 订阅的所有行（用于 console UI 展示"我有什么"）。
 * Rows ordered by period_end desc 方便取最长那条作为"当前主订阅"。
 */
export async function listActiveSubscriptions(userId: string) {
  const now = new Date();
  return db
    .select({
      id: subscriptions.id,
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelledAt: subscriptions.cancelledAt,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, now),
      ),
    )
    .orderBy(desc(subscriptions.currentPeriodEnd));
}

/**
 * 给定 effective plan，返回对应的 PlanLimits — pro / legacy_lifetime 返回 null
 * 表示"unlimited"，调用方据此决定是否 bypass quota gate。
 */
export function planLimits(plan: EffectivePlan): PlanLimits | null {
  if (plan === "pro" || plan === "legacy_lifetime") return null; // unlimited
  if (plan === "plus") return PLAN_LIMITS.plus;
  return PLAN_LIMITS.free;
}

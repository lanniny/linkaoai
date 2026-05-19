import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db, subscriptions } from "@/lib/db";

/**
 * 退款资格 + 建议金额计算。
 *
 * 决策表（按 payment.plan + period_days 区分）：
 *   plan=null              → legacy 单科一次性永久买断；全额退款（保留旧逻辑）
 *   plan='plus'            → Plus 月订阅；不退（文案承诺月付不在挂科退款范围）
 *   plan='pro', 30 天     → Pro 月订阅；不退（同上）
 *   plan='pro', 365 天    → Pro 年付；按未使用月份比例退款（核心新逻辑）
 *
 * 年付按比例：refund = amount × (剩余天数 / 总天数)
 *   - 已过期 → 退 0（拒绝）
 *   - 完全未使用 → 全退
 *   - 部分使用 → 按未来天数比例
 *
 * 注：refund_amount 不写新字段，由 admin 接受 / 修改建议后写入 refund_reason
 * 文本字段（"按比例退款 ¥X / 已用 N 天 / 共 Y 天"），实际退款由 admin 在
 * EPay 后台或微信/支付宝手工操作，系统行只做 audit。
 */

export type Plan = "plus" | "pro" | null;

export interface RefundCalc {
  eligible: boolean;
  /** 建议退款金额（CNY，2 位小数）。0 = 不退；amount = 全退。 */
  suggested: number;
  /** 给 admin 看的解释文字 + 在 refund_reason 里编码。 */
  breakdown: string;
  /** 不可退的原因（eligible=false 时设置）。 */
  reason?: string;
}

export interface PaymentForRefund {
  id: string;
  userId: string;
  amountCny: number;
  status: string;
  plan: Plan;
  periodDays: number | null;
  paidAt: Date | null;
}

/**
 * 给定 payment row（必须 status='paid'），计算退款资格 + 建议金额。
 * 不查 DB（除非需要订阅 row 算实际期满日 — period_days 是 365 时才查）。
 */
export async function calculateRefund(
  p: PaymentForRefund,
): Promise<RefundCalc> {
  if (p.status !== "paid") {
    return {
      eligible: false,
      suggested: 0,
      breakdown: `订单状态 ${p.status}，不可退`,
      reason: "状态非 paid",
    };
  }

  // legacy 单科永久 — 沿用旧策略全退（payments.plan IS NULL）
  if (p.plan === null) {
    return {
      eligible: true,
      suggested: round2(p.amountCny),
      breakdown: `legacy 单科永久买断 · 全额退款 ¥${p.amountCny.toFixed(2)}`,
    };
  }

  // 月付订阅（30 天）— 文案承诺过不退
  if (p.periodDays === 30) {
    return {
      eligible: false,
      suggested: 0,
      breakdown: `${p.plan === "pro" ? "Pro" : "Plus"} 月订阅 · 月付不适用挂科退款政策`,
      reason: "月付订阅条款不支持退款",
    };
  }

  // Pro 年付（365 天）— 按未使用比例
  if (p.plan === "pro" && p.periodDays === 365) {
    // 找该 payment 关联的 active subscription 行，取 period_start/period_end
    const [sub] = await db
      .select({
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.paymentId, p.id),
          eq(subscriptions.userId, p.userId),
        ),
      )
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(1);

    if (!sub) {
      // 没找到对应订阅行（数据不一致；保险起见全退）
      return {
        eligible: true,
        suggested: round2(p.amountCny),
        breakdown: `Pro 年付订单但找不到对应订阅行 · 全额退款 ¥${p.amountCny.toFixed(2)}`,
      };
    }

    const now = Date.now();
    const startMs = new Date(sub.currentPeriodStart).getTime();
    const endMs = new Date(sub.currentPeriodEnd).getTime();
    const totalMs = endMs - startMs;

    if (sub.status === "expired" || now >= endMs) {
      return {
        eligible: false,
        suggested: 0,
        breakdown: `Pro 年付已到期 · 不可退`,
        reason: "订阅期满",
      };
    }

    if (now <= startMs) {
      // 还没生效（理论上 admin 授予一个未来 period 才可能，正常付费立即生效）
      return {
        eligible: true,
        suggested: round2(p.amountCny),
        breakdown: `Pro 年付未生效 · 全额退款 ¥${p.amountCny.toFixed(2)}`,
      };
    }

    const usedDays = Math.max(
      0,
      Math.floor((now - startMs) / 86400_000),
    );
    const totalDays = Math.max(1, Math.round(totalMs / 86400_000));
    const remainingDays = Math.max(0, totalDays - usedDays);
    const suggested = round2((p.amountCny * remainingDays) / totalDays);

    return {
      eligible: true,
      suggested,
      breakdown: `Pro 年付 · 已用 ${usedDays} / ${totalDays} 天 · 按比例退款 ¥${suggested.toFixed(2)}（原价 ¥${p.amountCny.toFixed(2)}）`,
    };
  }

  // 兜底（未知 plan / period 组合）
  return {
    eligible: false,
    suggested: 0,
    breakdown: `未知订单类型 plan=${p.plan} period=${p.periodDays}d · 请人工核实`,
    reason: "未识别的订单类型",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

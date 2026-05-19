import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, payments, subscriptions } from "@/lib/db";
import { calculateRefund, type PaymentForRefund } from "@/lib/refund-calc";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().min(1).max(200),
  // 可选：admin 显式指定退款金额（CNY）。不传则按 calculateRefund() 的
  // suggested 值。系统不阻止 admin 在合理范围（0 ≤ amount ≤ payment.amount_cny）
  // 内调整 — 让 ops 能处理边缘 case。
  refundAmount: z.number().min(0).max(99999).optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      amountCny: payments.amountCny,
      status: payments.status,
      plan: payments.plan,
      periodDays: payments.periodDays,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json(
      { error: "not_found", message: "订单不存在" },
      { status: 404 },
    );
  }
  if (existing.status !== "paid") {
    return NextResponse.json(
      {
        error: "invalid_state",
        message: `当前状态 ${existing.status} · 仅 paid 可退款`,
      },
      { status: 409 },
    );
  }

  // 计算退款资格 + 建议金额。即使 calc.eligible=false admin 仍可强制退款
  // （边缘 case，比如月付订阅遇到特殊情况），但 refund_reason 字段会带
  // calc.breakdown 留 audit 说明强制原因。
  const calc = await calculateRefund({
    id: existing.id,
    userId: existing.userId,
    amountCny: Number(existing.amountCny),
    status: existing.status,
    plan: (existing.plan ?? null) as PaymentForRefund["plan"],
    periodDays: existing.periodDays ?? null,
    paidAt: existing.paidAt,
  });

  const refundAmount =
    body.refundAmount !== undefined ? body.refundAmount : calc.suggested;

  // 上限 guard — 不让退款金额超过订单金额（防 admin 输错）
  if (refundAmount > Number(existing.amountCny)) {
    return NextResponse.json(
      {
        error: "amount_exceeds_payment",
        message: `退款金额 ¥${refundAmount} 超过订单金额 ¥${existing.amountCny}`,
      },
      { status: 400 },
    );
  }

  // 把退款金额编码到 reason 文本里 — 不加 schema 字段。格式：
  // "<admin 输入的 reason> · 退 ¥<amount> · <breakdown>"
  // 财务对账 + /console/billing/history 渲染时直接读 refund_reason 即可。
  const composedReason = `${body.reason} · 退 ¥${refundAmount.toFixed(2)} · ${calc.breakdown}`;

  try {
    await db
      .update(payments)
      .set({
        status: "refunded",
        refundAt: new Date(),
        refundReason: composedReason.slice(0, 200),
        refundBy: caller!.id,
      })
      .where(eq(payments.id, id));

    // 订阅退款 → 同步 cancel 对应 active subscription 行（保留 audit）
    if (existing.plan === "plus" || existing.plan === "pro") {
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(
          and(
            eq(subscriptions.paymentId, id),
            eq(subscriptions.status, "active"),
          ),
        );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "update_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }

  console.warn(
    `[admin/refund] admin=${caller!.email ?? caller!.id} refunded payment=${id} amount=¥${refundAmount} (suggested=¥${calc.suggested})`,
  );

  return NextResponse.json({
    ok: true,
    id,
    refundAmount,
    suggested: calc.suggested,
    breakdown: calc.breakdown,
  });
}

// GET — UI 打开退款 modal 时先调一次拿建议金额 + breakdown
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const [existing] = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      amountCny: payments.amountCny,
      status: payments.status,
      plan: payments.plan,
      periodDays: payments.periodDays,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const calc = await calculateRefund({
    id: existing.id,
    userId: existing.userId,
    amountCny: Number(existing.amountCny),
    status: existing.status,
    plan: (existing.plan ?? null) as PaymentForRefund["plan"],
    periodDays: existing.periodDays ?? null,
    paidAt: existing.paidAt,
  });

  return NextResponse.json({
    paymentId: existing.id,
    amountCny: Number(existing.amountCny),
    plan: existing.plan,
    periodDays: existing.periodDays,
    calc,
  });
}

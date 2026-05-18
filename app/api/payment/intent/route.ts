import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { db, payments } from "@/lib/db";
import { getPersistContext } from "@/lib/persistence";
import { PLAN_PRICE_CNY } from "@/lib/subscription";
import { readSetting } from "@/lib/system-settings";
import { paymentIntentRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

// 旧版单科一次性永久买断默认价（admin 可通过 system_settings.pricing 覆盖）。
const DEFAULT_SUBJECT_AMOUNT_CNY = 19.9;

export async function POST(req: NextRequest) {
  const ctx = await getPersistContext();
  if (!ctx) {
    return NextResponse.json(
      { error: "请先登录后再下单" },
      { status: 401 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "请求体不是合法 JSON" },
      { status: 400 },
    );
  }

  const parsed = paymentIntentRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "请求体不符合 schema", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { purchase_type, subject, channel, notes } = parsed.data;

  // 按 purchase_type 计算金额 + 决定 payments 行的 subject / plan 字段。
  // payments.subject 字段双语义：单科购买填学科名，订阅填 plan 名（plus/pro），
  // 这样 admin/orders 页 + billing/history 不改也能显示"Pro 订阅"作为一行。
  let amountCny: number;
  let subjectField: string;
  let planField: "plus" | "pro" | null;

  if (purchase_type === "single_subject") {
    // subject 由 schema.refine 保证非空
    const pricing = await readSetting("pricing");
    amountCny = Number(pricing[subject!]) || DEFAULT_SUBJECT_AMOUNT_CNY;
    subjectField = subject!;
    planField = null;
  } else if (purchase_type === "plus_monthly") {
    amountCny = PLAN_PRICE_CNY.plus;
    subjectField = "Plus 月订阅";
    planField = "plus";
  } else {
    // pro_monthly
    amountCny = PLAN_PRICE_CNY.pro;
    subjectField = "Pro 月订阅";
    planField = "pro";
  }

  try {
    const [order] = await db
      .insert(payments)
      .values({
        userId: ctx.user_id,
        subject: subjectField,
        amountCny,
        channel,
        status: "pending",
        plan: planField,
        notes: notes ?? null,
      })
      .returning({
        id: payments.id,
        subject: payments.subject,
        amountCny: payments.amountCny,
        channel: payments.channel,
        status: payments.status,
        plan: payments.plan,
        createdAt: payments.createdAt,
      });

    return NextResponse.json({ order });
  } catch (err) {
    console.error("[/api/payment/intent] insert failed:", err);
    return NextResponse.json(
      { error: "下单失败", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

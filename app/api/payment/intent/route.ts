import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { db, payments } from "@/lib/db";
import { getPersistContext } from "@/lib/persistence";
import { paymentIntentRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

// Fixed MVP pricing — change here when introducing tiered plans.
const AMOUNT_CNY_PER_SUBJECT = 19.9;

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
  const { subject, channel, notes } = parsed.data;

  try {
    const [order] = await db
      .insert(payments)
      .values({
        userId: ctx.user_id,
        subject,
        amountCny: AMOUNT_CNY_PER_SUBJECT,
        channel,
        status: "pending",
        notes: notes ?? null,
      })
      .returning({
        id: payments.id,
        subject: payments.subject,
        amountCny: payments.amountCny,
        channel: payments.channel,
        status: payments.status,
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

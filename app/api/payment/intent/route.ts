import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { db, payments } from "@/lib/db";
import { getPersistContext } from "@/lib/persistence";
import { readSetting } from "@/lib/system-settings";
import { paymentIntentRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

// Per-subject pricing — admin-tunable via system_settings.pricing.
// Default falls back to 19.9 if the row is missing for any reason.
const DEFAULT_AMOUNT_CNY = 19.9;

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

  const pricing = await readSetting("pricing");
  const amountCny = Number(pricing[subject]) || DEFAULT_AMOUNT_CNY;

  try {
    const [order] = await db
      .insert(payments)
      .values({
        userId: ctx.user_id,
        subject,
        amountCny,
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

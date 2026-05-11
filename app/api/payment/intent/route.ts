import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getPersistContext } from "@/lib/persistence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { paymentIntentRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

// Fixed MVP pricing — change here when introducing tiered plans.
const AMOUNT_CNY_PER_SUBJECT = 19.9;

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error: "下单功能尚未开通（Supabase service_role 未配置）",
      },
      { status: 503 },
    );
  }

  // Verify session via the anon-bound client (reads HttpOnly cookies);
  // we still write via service_role below to bypass RLS, but only with
  // the user_id we just authenticated.
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

  // Use admin client to insert — RLS in 0001_initial_schema.sql intentionally
  // restricts public.payments to SELECT-only for users; status mutations
  // (pending -> paid / refunded) go through trusted server code only.
  const admin = createSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("payments")
    .insert({
      user_id: ctx.user_id,
      subject,
      amount_cny: AMOUNT_CNY_PER_SUBJECT,
      channel,
      status: "pending",
      notes: notes ?? null,
    })
    .select("id, subject, amount_cny, channel, status, created_at")
    .single();

  if (error) {
    console.error("[/api/payment/intent] insert failed:", error);
    return NextResponse.json(
      { error: "下单失败", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ order });
}

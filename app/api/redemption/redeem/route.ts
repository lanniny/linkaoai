import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getPersistContext } from "@/lib/persistence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { redemptionRedeemRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "兑换码功能尚未开通（Supabase 未配置）" },
      { status: 503 },
    );
  }

  const ctx = await getPersistContext();
  if (!ctx) {
    return NextResponse.json(
      { error: "请先登录后再兑换" },
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

  const parsed = redemptionRedeemRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "兑换码格式不合法", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const code = parsed.data.code.trim().toUpperCase();

  const admin = createSupabaseAdminClient();

  // 1. Look up active code
  const { data: codeRow, error: lookupErr } = await admin
    .from("redemption_codes")
    .select("id, code, subject, amount_cny, status, expires_at")
    .ilike("code", code)
    .single();

  if (lookupErr || !codeRow) {
    return NextResponse.json(
      { error: "兑换码不存在" },
      { status: 404 },
    );
  }
  if (codeRow.status !== "active") {
    return NextResponse.json(
      { error: `兑换码状态为 ${codeRow.status}，无法使用` },
      { status: 400 },
    );
  }
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    // Lazy-mark expired so subsequent lookups short-circuit fast
    await admin
      .from("redemption_codes")
      .update({ status: "expired" })
      .eq("id", codeRow.id);
    return NextResponse.json(
      { error: "兑换码已过期" },
      { status: 400 },
    );
  }

  // 2. Atomically mark code as used (CAS on status='active')
  const usedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from("redemption_codes")
    .update({
      status: "used",
      used_by: ctx.user_id,
      used_at: usedAt,
    })
    .eq("id", codeRow.id)
    .eq("status", "active")
    .select("id")
    .single();

  if (claimErr || !claimed) {
    // Lost the race: someone else claimed it between lookup and update
    return NextResponse.json(
      { error: "兑换码刚刚被使用，请换一张" },
      { status: 409 },
    );
  }

  // 3. Insert paid payment row as audit trail / unlock signal
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      user_id: ctx.user_id,
      subject: codeRow.subject,
      amount_cny: codeRow.amount_cny,
      channel: "redemption_code",
      status: "paid",
      paid_at: usedAt,
      external_ref: codeRow.code,
      notes: `redemption_code_id=${codeRow.id}`,
    })
    .select("id, subject, amount_cny, status, channel, created_at")
    .single();

  if (payErr) {
    // Don't unclaim — code is genuinely consumed; surface to founder so
    // they can manually rebuild the audit row if needed.
    console.error(
      "[/api/redemption/redeem] payment insert failed after code claimed:",
      payErr,
    );
    return NextResponse.json(
      {
        error: "兑换成功但订单记账失败，请联系客服",
        code_id: codeRow.id,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    subject: codeRow.subject,
    amount_cny: codeRow.amount_cny,
    payment,
  });
}

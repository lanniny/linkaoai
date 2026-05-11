import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { buildEpayPaymentUrl, getEpayConfig } from "@/lib/epay";
import { getPersistContext } from "@/lib/persistence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { epayCreateRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const epay = getEpayConfig();
  if (!epay) {
    return NextResponse.json(
      { error: "EPay 自动支付尚未配置（请填写 EPAY_* 环境变量）" },
      { status: 503 },
    );
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未配置" },
      { status: 503 },
    );
  }

  const ctx = await getPersistContext();
  if (!ctx) {
    return NextResponse.json(
      { error: "请先登录后再支付" },
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

  const parsed = epayCreateRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "请求体不符合 schema", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { order_id, type } = parsed.data;

  // verify order belongs to user + still pending
  const admin = createSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("payments")
    .select("id, user_id, status, subject, amount_cny")
    .eq("id", order_id)
    .eq("user_id", ctx.user_id)
    .single();

  if (error || !order) {
    return NextResponse.json(
      { error: "订单不存在或不属于你" },
      { status: 404 },
    );
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: `订单当前状态为 ${order.status}，不可重复支付` },
      { status: 400 },
    );
  }

  // Mark channel/type as epay before redirecting — gives webhook a trail.
  await admin
    .from("payments")
    .update({
      channel: type === "alipay" ? "epay_alipay" : "epay_wxpay",
    })
    .eq("id", order.id);

  const paymentUrl = buildEpayPaymentUrl(epay, {
    type,
    out_trade_no: order.id,
    name: `临考 ${order.subject} 解锁`,
    money: Number(order.amount_cny).toFixed(2),
  });

  return NextResponse.json({ payment_url: paymentUrl });
}

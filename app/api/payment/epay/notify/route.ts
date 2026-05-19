import "server-only";

import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, payments } from "@/lib/db";
import { getEpayConfig, verifyEpayCallback } from "@/lib/epay";
import { issueSubscriptionFromPayment } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache callbacks

// EPay sends server-to-server notify as GET (sometimes POST, depending on
// gateway). Accept both; idempotent on retries — if order is already paid,
// we just return 'success' so EPay stops re-sending.
async function handle(req: NextRequest): Promise<NextResponse> {
  const epay = getEpayConfig();
  if (!epay) {
    return new NextResponse("disabled", { status: 503 });
  }

  // Collect params from query (GET) or url-encoded body (POST)
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") ?? "";
      if (ct.includes("application/x-www-form-urlencoded")) {
        const form = await req.formData();
        for (const [k, v] of form.entries()) params[k] = String(v);
      } else if (ct.includes("application/json")) {
        const json = await req.json();
        for (const k of Object.keys(json)) params[k] = String(json[k]);
      }
    } catch {
      // fall through — params from query string still apply
    }
  }

  if (!verifyEpayCallback(params, epay.key)) {
    console.error("[epay/notify] sign verification failed", {
      ray: req.headers.get("cf-ray"),
    });
    return new NextResponse("sign_error", { status: 400 });
  }

  const tradeStatus = params.trade_status;
  const orderId = params.out_trade_no;
  if (!orderId) {
    return new NextResponse("missing_order", { status: 400 });
  }
  if (tradeStatus !== "TRADE_SUCCESS") {
    // Acknowledge non-success states without flipping the order.
    return new NextResponse("success", { status: 200 });
  }

  try {
    // Idempotent: only flip pending -> paid; replaying after a paid state
    // is a no-op but still returns success so EPay stops retrying.
    const updated = await db
      .update(payments)
      .set({
        status: "paid",
        paidAt: new Date(),
        epayTradeNo: params.trade_no ?? null,
        epayOutTradeNo: orderId,
      })
      .where(and(eq(payments.id, orderId), eq(payments.status, "pending")))
      .returning({
        id: payments.id,
        userId: payments.userId,
        plan: payments.plan,
        periodDays: payments.periodDays,
      });

    // 订阅类付款 → 创建/延期 subscriptions 行（fire-and-forget，失败不阻塞 EPay）
    const row = updated[0];
    if (row && (row.plan === "plus" || row.plan === "pro")) {
      void issueSubscriptionFromPayment({
        paymentId: row.id,
        userId: row.userId,
        plan: row.plan,
        periodDays: row.periodDays ?? undefined,
      });
    }
  } catch (err) {
    console.error("[epay/notify] update failed:", err);
    return new NextResponse("db_error", { status: 500 });
  }

  return new NextResponse("success", { status: 200 });
}

export const GET = handle;
export const POST = handle;

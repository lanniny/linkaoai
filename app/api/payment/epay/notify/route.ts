import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getEpayConfig, verifyEpayCallback } from "@/lib/epay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

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
  if (!isSupabaseAdminConfigured()) {
    return new NextResponse("db_not_configured", { status: 503 });
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

  // Only mark paid on explicit success status
  const tradeStatus = params.trade_status;
  const orderId = params.out_trade_no;
  if (!orderId) {
    return new NextResponse("missing_order", { status: 400 });
  }
  if (tradeStatus !== "TRADE_SUCCESS") {
    // Acknowledge other states (e.g., REFUND) without flipping to paid
    return new NextResponse("success", { status: 200 });
  }

  const admin = createSupabaseAdminClient();
  // Idempotent: only flip pending -> paid; if already paid we still return
  // success so EPay stops retrying.
  const { error: updateErr } = await admin
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      external_ref: params.trade_no ?? null,
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (updateErr) {
    console.error("[epay/notify] update failed:", updateErr);
    return new NextResponse("db_error", { status: 500 });
  }

  return new NextResponse("success", { status: 200 });
}

export const GET = handle;
export const POST = handle;

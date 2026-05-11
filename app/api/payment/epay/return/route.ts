import { NextRequest, NextResponse } from "next/server";

import { getEpayConfig, verifyEpayCallback } from "@/lib/epay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// User browser is redirected here after paying. We validate the callback
// signature server-side, then bounce them to /pay with a status flag the
// PayForm component reads to show the confirmation banner.
export async function GET(req: NextRequest) {
  const epay = getEpayConfig();
  const origin = req.nextUrl.origin;
  if (!epay) {
    return NextResponse.redirect(`${origin}/pay?return=disabled`);
  }

  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    params[k] = v;
  });

  if (!verifyEpayCallback(params, epay.key)) {
    return NextResponse.redirect(`${origin}/pay?return=sign_error`);
  }

  const success = params.trade_status === "TRADE_SUCCESS";
  const orderId = params.out_trade_no ?? "";

  return NextResponse.redirect(
    `${origin}/pay?return=${success ? "success" : "failed"}&order=${orderId}`,
  );
}

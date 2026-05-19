import { NextRequest, NextResponse } from "next/server";

import { getEpayConfig, verifyEpayCallback } from "@/lib/epay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// User browser is redirected here after paying. We validate the callback
// signature server-side, then bounce them to /console/billing/history with a
// status flag the page reads to show a confirmation banner. (Was /pay back
// when single-subject was the only purchase flow; subscription billing now
// lives under /console/billing.)
export async function GET(req: NextRequest) {
  const epay = getEpayConfig();
  const origin = req.nextUrl.origin;
  const dest = `${origin}/console/billing/history`;
  if (!epay) {
    return NextResponse.redirect(`${dest}?return=disabled`);
  }

  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    params[k] = v;
  });

  if (!verifyEpayCallback(params, epay.key)) {
    return NextResponse.redirect(`${dest}?return=sign_error`);
  }

  const success = params.trade_status === "TRADE_SUCCESS";
  const orderId = params.out_trade_no ?? "";

  return NextResponse.redirect(
    `${dest}?return=${success ? "success" : "failed"}&order=${orderId}`,
  );
}

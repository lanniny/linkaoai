import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { snapshotAllQuotas } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me/quota — returns the signed-in user's current quota snapshot
// across all 4 AI routes. Used by /console/practice to show a live
// "remaining this month" banner without hitting an AI endpoint first.
//
// Unauthenticated callers get { signedIn: false } and JSON.stringify-safe
// Infinity sentinels (`-1`) so the client can branch on signedIn alone.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ signedIn: false, quota: null });
  }

  const snap = await snapshotAllQuotas(session.user.id);
  // Replace Infinity with -1 so the JSON payload is well-formed; client
  // treats -1 the same way it treats the `isPaid` flag.
  const safe = Object.fromEntries(
    Object.entries(snap).map(([k, v]) => [
      k,
      {
        ...v,
        limit: Number.isFinite(v.limit) ? v.limit : -1,
        remaining: Number.isFinite(v.remaining) ? v.remaining : -1,
      },
    ]),
  );

  return NextResponse.json({ signedIn: true, quota: safe });
}

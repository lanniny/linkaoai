import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// POST /auth/signout — invalidate the better-auth session then bounce home.
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  try {
    await auth.api.signOut({ headers: request.headers });
  } catch (err) {
    console.warn("[/auth/signout] signOut failed:", err);
  }
  return NextResponse.redirect(`${url.origin}/`, 303);
}

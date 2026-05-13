import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Legacy Supabase magic-link landing path. After the SQLite + better-auth
// migration there is no magic-link flow yet; bounce to /login with a hint
// so any stale email link gracefully degrades instead of 404.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

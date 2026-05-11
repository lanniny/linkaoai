import { NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Supabase magic-link redirect lands here with ?code=...
// We exchange the code for a session (sets the auth cookie), then redirect
// to the original `next` path (or home).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      `${origin}/login?error=supabase_not_configured`,
    );
  }

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[/auth/callback] exchangeCodeForSession failed:", error);
    } catch (err) {
      console.error("[/auth/callback] threw:", err);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

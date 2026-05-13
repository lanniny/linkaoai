import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "supabase_admin_not_configured" },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!isAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  const admin = createSupabaseAdminClient();
  // Only flip pending → paid; refuse on other transitions to keep the
  // audit trail honest. Paid date = now.
  const { data: existing, error: readErr } = await admin
    .from("payments")
    .select("id, status")
    .eq("id", id)
    .single();
  if (readErr || !existing) {
    return NextResponse.json(
      { error: "not_found", message: readErr?.message ?? "Payment not found" },
      { status: 404 },
    );
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      {
        error: "invalid_state",
        message: `当前状态 ${existing.status} · 仅 pending 可手动标记为 paid`,
      },
      { status: 409 },
    );
  }

  const { error: updErr } = await admin
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      // Stamp who approved this in the existing notes column (best effort).
      notes_admin: `marked by ${caller!.email ?? caller!.id}`,
    })
    .eq("id", id);

  if (updErr) {
    // Fall back without notes_admin if the column doesn't exist yet — the
    // important state transition is the status flip.
    const isMissingCol =
      /column.+notes_admin.+does not exist/i.test(updErr.message ?? "") ||
      /notes_admin/i.test(updErr.message ?? "");
    if (isMissingCol) {
      const retry = await admin
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (retry.error) {
        return NextResponse.json(
          { error: "update_failed", message: retry.error.message },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "update_failed", message: updErr.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, id });
}

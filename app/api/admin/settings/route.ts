import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readAllSettings } from "@/lib/system-settings";

export const runtime = "nodejs";

const upsertSchema = z.object({
  key: z.enum(["pricing", "free_tier_quota", "maintenance", "announcement"]),
  value_json: z.unknown(),
});

export async function GET() {
  const settings = await readAllSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
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

  let body: z.infer<typeof upsertSchema>;
  try {
    body = upsertSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("system_settings").upsert(
    {
      key: body.key,
      value_json: body.value_json,
      updated_at: new Date().toISOString(),
      updated_by: caller!.id,
    },
    { onConflict: "key" },
  );

  if (error) {
    return NextResponse.json(
      { error: "upsert_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, key: body.key });
}

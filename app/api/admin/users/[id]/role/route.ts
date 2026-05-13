import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isRootAdmin } from "@/lib/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  // 0 = user, 1 = admin, 10 = root
  role: z.union([z.literal(0), z.literal(1), z.literal(10)]),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "supabase_admin_not_configured" },
      { status: 503 },
    );
  }

  // Only root admins may rebalance roles.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!isRootAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要 root 权限" },
      { status: 403 },
    );
  }

  const { id: targetId } = await ctx.params;
  if (targetId === caller!.id) {
    return NextResponse.json(
      { error: "self_target", message: "不能修改自己的角色（防止误降权）" },
      { status: 400 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  // Preserve existing app_metadata; merge only `role`.
  const { data: target, error: getErr } = await admin.auth.admin.getUserById(
    targetId,
  );
  if (getErr || !target.user) {
    return NextResponse.json(
      { error: "user_not_found", message: getErr?.message ?? "User not found" },
      { status: 404 },
    );
  }
  const nextMeta = { ...(target.user.app_metadata ?? {}), role: body.role };

  const { data, error } = await admin.auth.admin.updateUserById(targetId, {
    app_metadata: nextMeta,
  });
  if (error) {
    return NextResponse.json(
      { error: "update_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    user_id: data.user?.id,
    role: data.user?.app_metadata?.role,
  });
}

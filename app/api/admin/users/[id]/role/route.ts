import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isRootAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, user } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  role: z.union([z.literal(0), z.literal(1), z.literal(10)]),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
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

  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1);
  if (!target) {
    return NextResponse.json(
      { error: "user_not_found", message: "User not found" },
      { status: 404 },
    );
  }

  try {
    await db
      .update(user)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(user.id, targetId));
  } catch (err) {
    return NextResponse.json(
      {
        error: "update_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, user_id: targetId, role: body.role });
}

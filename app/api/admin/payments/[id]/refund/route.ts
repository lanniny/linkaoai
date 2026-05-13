import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, payments } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().min(1).max(200),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: payments.id, status: payments.status })
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json(
      { error: "not_found", message: "订单不存在" },
      { status: 404 },
    );
  }
  if (existing.status !== "paid") {
    return NextResponse.json(
      {
        error: "invalid_state",
        message: `当前状态 ${existing.status} · 仅 paid 可退款`,
      },
      { status: 409 },
    );
  }

  try {
    await db
      .update(payments)
      .set({
        status: "refunded",
        refundAt: new Date(),
        refundReason: body.reason,
        refundBy: caller!.id,
      })
      .where(eq(payments.id, id));
  } catch (err) {
    return NextResponse.json(
      {
        error: "update_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}

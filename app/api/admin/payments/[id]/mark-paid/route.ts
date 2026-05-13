import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, payments } from "@/lib/db";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  const [existing] = await db
    .select({ id: payments.id, status: payments.status })
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json(
      { error: "not_found", message: "Payment not found" },
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

  try {
    await db
      .update(payments)
      .set({
        status: "paid",
        paidAt: new Date(),
        notesAdmin: `marked by ${caller!.email ?? caller!.id}`,
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

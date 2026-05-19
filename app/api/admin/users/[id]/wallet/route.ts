import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, user } from "@/lib/db";
import { consume, getBalance, topup } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/[id]/wallet — admin 手工调整钱包余额
 *
 * body: { amountCents: number, reason: string }
 *   amountCents > 0 → 走 topup（充值 / 体验金 / 客服补单）
 *   amountCents < 0 → 走 consume（扣减 / 退款回收 / 误操作纠正）
 *   amountCents = 0 → 拒绝（无意义）
 *
 * description 自带 "admin=X reason=..." 留 audit。
 */
const bodySchema = z.object({
  amountCents: z
    .number()
    .int()
    .min(-100000)
    .max(100000)
    .refine((n) => n !== 0, "amountCents 必须 ≠ 0"),
  reason: z.string().min(2).max(120),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
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

  const { id: targetUserId } = await params;
  const [target] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const description = `admin 调整: ${body.reason} · by ${caller!.email ?? caller!.id}`;

  try {
    if (body.amountCents > 0) {
      const r = await topup({
        userId: targetUserId,
        amountCents: body.amountCents,
        description,
      });
      console.warn(
        `[admin/wallet-adjust] +${body.amountCents}c to user=${target.email ?? targetUserId} by ${caller!.email}`,
      );
      return NextResponse.json({
        ok: true,
        delta: body.amountCents,
        balanceAfterCents: r.balanceAfterCents,
      });
    }

    // amountCents < 0 → consume abs(amount)
    const abs = -body.amountCents;
    const result = await consume({
      userId: targetUserId,
      amountCents: abs,
      description,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "insufficient_balance",
          message: `余额不足 — 当前 ¥${(result.balance / 100).toFixed(2)} · 需扣 ¥${(abs / 100).toFixed(2)}`,
          balance: result.balance,
        },
        { status: 409 },
      );
    }
    console.warn(
      `[admin/wallet-adjust] -${abs}c from user=${target.email ?? targetUserId} by ${caller!.email}`,
    );
    return NextResponse.json({
      ok: true,
      delta: body.amountCents,
      balanceAfterCents: result.balanceAfterCents,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "adjust_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}

/**
 * GET — admin 查看用户当前钱包余额（用户视图的 read-only mirror）
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const balanceCents = await getBalance(id);
  return NextResponse.json({ userId: id, balanceCents });
}

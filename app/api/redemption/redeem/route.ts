import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db, payments, redemptionCodes } from "@/lib/db";
import { getPersistContext } from "@/lib/persistence";
import { redemptionRedeemRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ctx = await getPersistContext();
  if (!ctx) {
    return NextResponse.json(
      { error: "请先登录后再兑换" },
      { status: 401 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "请求体不是合法 JSON" },
      { status: 400 },
    );
  }

  const parsed = redemptionRedeemRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "兑换码格式不合法", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const code = parsed.data.code.trim().toUpperCase();

  // 1. Lookup code (case-insensitive via UPPER())
  const [codeRow] = await db
    .select({
      id: redemptionCodes.id,
      code: redemptionCodes.code,
      subject: redemptionCodes.subject,
      amountCny: redemptionCodes.amountCny,
      status: redemptionCodes.status,
      expiresAt: redemptionCodes.expiresAt,
    })
    .from(redemptionCodes)
    .where(sql`UPPER(${redemptionCodes.code}) = ${code}`)
    .limit(1);

  if (!codeRow) {
    return NextResponse.json({ error: "兑换码不存在" }, { status: 404 });
  }
  if (codeRow.status !== "active") {
    return NextResponse.json(
      { error: `兑换码状态为 ${codeRow.status}，无法使用` },
      { status: 400 },
    );
  }
  if (codeRow.expiresAt && new Date(codeRow.expiresAt) < new Date()) {
    await db
      .update(redemptionCodes)
      .set({ status: "expired" })
      .where(eq(redemptionCodes.id, codeRow.id));
    return NextResponse.json({ error: "兑换码已过期" }, { status: 400 });
  }

  // 2. Atomic CAS: only flip active → used; rowsAffected tells us if we won.
  const usedAt = new Date();
  const claimResult = await db
    .update(redemptionCodes)
    .set({
      status: "used",
      usedBy: ctx.user_id,
      usedAt,
    })
    .where(
      and(eq(redemptionCodes.id, codeRow.id), eq(redemptionCodes.status, "active")),
    )
    .returning({ id: redemptionCodes.id });

  if (claimResult.length === 0) {
    return NextResponse.json(
      { error: "兑换码刚刚被使用，请换一张" },
      { status: 409 },
    );
  }

  // 3. Insert paid payment row as audit trail + unlock signal.
  try {
    const [payment] = await db
      .insert(payments)
      .values({
        userId: ctx.user_id,
        subject: codeRow.subject,
        amountCny: codeRow.amountCny,
        channel: "redemption_code",
        status: "paid",
        paidAt: usedAt,
        notes: `redemption_code_id=${codeRow.id}`,
      })
      .returning({
        id: payments.id,
        subject: payments.subject,
        amountCny: payments.amountCny,
        status: payments.status,
        channel: payments.channel,
        createdAt: payments.createdAt,
      });

    return NextResponse.json({
      success: true,
      subject: codeRow.subject,
      amount_cny: codeRow.amountCny,
      payment,
    });
  } catch (err) {
    console.error(
      "[/api/redemption/redeem] payment insert failed after code claimed:",
      err,
    );
    return NextResponse.json(
      {
        error: "兑换成功但订单记账失败，请联系客服",
        code_id: codeRow.id,
      },
      { status: 500 },
    );
  }
}

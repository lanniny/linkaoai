import { and, desc, eq, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, payments, walletTransactions } from "@/lib/db";
import { cnyToCents, topup } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 钱包对账 — 找出 status='paid' + plan='wallet' 但没对应 topup transaction
 * 的 payments 行（fire-and-forget topup 失败留下的"孤儿"订单）。
 *
 * 不引入消息队列 — admin 定期手工调 GET 看是否有待补单，POST 一键补单。
 * 这是 MVP 阶段"够用"的对账方式；用户量上来后可加 cron 自动补。
 *
 * GET → { orphans: [{ paymentId, userId, amountCny, createdAt }] }
 * POST { paymentId } → 补一条 topup，让账平
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 子查询找出已经有 topup transaction 的 payment_id
  const linkedPayments = await db
    .select({ paymentId: walletTransactions.paymentId })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.type, "topup"),
        isNotNull(walletTransactions.paymentId),
      ),
    );
  const linkedSet = new Set(
    linkedPayments.map((r) => r.paymentId).filter(Boolean) as string[],
  );

  // 找所有 paid + plan='wallet' 的 payments
  const candidates = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      amountCny: payments.amountCny,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(and(eq(payments.status, "paid"), eq(payments.plan, "wallet")))
    .orderBy(desc(payments.paidAt))
    .limit(500);

  const orphans = candidates
    .filter((p) => !linkedSet.has(p.id))
    .map((p) => ({
      paymentId: p.id,
      userId: p.userId,
      amountCny: Number(p.amountCny),
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    }));

  return NextResponse.json({
    orphans,
    totalOrphans: orphans.length,
  });
}

const postSchema = z.object({
  paymentId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  // 校验：payment 必须是 paid + plan='wallet' + 还没 topup transaction
  const [pmt] = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      amountCny: payments.amountCny,
      status: payments.status,
      plan: payments.plan,
    })
    .from(payments)
    .where(eq(payments.id, body.paymentId))
    .limit(1);
  if (!pmt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (pmt.status !== "paid" || pmt.plan !== "wallet") {
    return NextResponse.json(
      {
        error: "invalid_state",
        message: `payment 状态 ${pmt.status}/${pmt.plan} 不是 paid/wallet`,
      },
      { status: 409 },
    );
  }

  // 二次检查：已有 topup transaction 就拒绝补单（幂等保护）
  const [existing] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.paymentId, body.paymentId),
        eq(walletTransactions.type, "topup"),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json(
      {
        error: "already_reconciled",
        message: "该订单已有对应 topup 流水，无需补单",
      },
      { status: 409 },
    );
  }

  try {
    const r = await topup({
      userId: pmt.userId,
      amountCents: cnyToCents(Number(pmt.amountCny)),
      paymentId: pmt.id,
      description: `对账补单 ¥${Number(pmt.amountCny).toFixed(2)} · by ${caller!.email ?? caller!.id}`,
    });
    console.warn(
      `[admin/wallet-reconcile] reconciled payment=${pmt.id} amount=¥${pmt.amountCny}`,
    );
    return NextResponse.json({
      ok: true,
      paymentId: pmt.id,
      balanceAfterCents: r.balanceAfterCents,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "reconcile_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}

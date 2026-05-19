import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { eq } from "drizzle-orm";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, subscriptions, user } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const grantSchema = z.object({
  plan: z.enum(["plus", "pro"]),
  periodDays: z.number().int().min(1).max(3650).default(30),
});

/**
 * POST /api/admin/users/[id]/subscription — admin 手工授予订阅
 *
 * 不经过 payments 表（不产生订单 / 不计收入）；直接通过
 * issueSubscriptionFromPayment 的同样路径写 subscriptions 行。用于客服补发、
 * 试用授予、争议解决等场景。每次授予记录在 ai_usage_logs (不) — 实际只在
 * server console.warn 留 audit。
 *
 * 未来可加 admin_audit_log 表；当前阶段够用。
 */
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

  let body: z.infer<typeof grantSchema>;
  try {
    body = grantSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const { id: targetUserId } = await params;
  // 校验目标 user 存在
  const [target] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);
  if (!target) {
    return NextResponse.json(
      { error: "user_not_found" },
      { status: 404 },
    );
  }

  // 走和 EPay/redemption 一样的路径，但 paymentId 留空（不绑订单）
  // issueSubscriptionFromPayment 当前 schema 要求 paymentId（FK to payments）；
  // 这里我们直接插一行新 active subscription 避免 paymentId 字段约束 — schema
  // 已是 nullable (payment_id 引用 set null on delete)。
  const now = new Date();
  const periodMs = body.periodDays * 86400_000;

  try {
    // Admin grant 不复用 issueSubscriptionFromPayment 的"同 plan 延期"逻辑 —
    // admin 操作更明确：每次 grant 都直接插一条新 active row，让 history 留
    // 完整的 audit trail。getUserPlan() 取最高 plan 自然能正确反映 effective。
    const [row] = await db
      .insert(subscriptions)
      .values({
        userId: targetUserId,
        plan: body.plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + periodMs),
        paymentId: null,
      })
      .returning({
        id: subscriptions.id,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      });

    console.warn(
      `[admin/grant-subscription] admin=${caller!.email ?? caller!.id} granted ${body.plan} +${body.periodDays}d to user=${target.email ?? targetUserId}`,
    );

    return NextResponse.json({
      ok: true,
      subscription: {
        id: row.id,
        plan: body.plan,
        currentPeriodEnd: row.currentPeriodEnd!.getTime(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "grant_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}

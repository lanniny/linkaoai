import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, subscriptions } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/users/[id]/subscription/[subId] — admin 撤销订阅
 *
 * Soft-revoke：status='cancelled' + cancelled_at=now，保留 row 作为 audit。
 * UI 上撤销立即生效（getUserPlan 只看 status='active'）。
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const { id: targetUserId, subId } = await params;

  // 严格条件：行必须属于该 user + 当前是 active（不允许撤销已经 cancelled/expired）
  const result = await db
    .update(subscriptions)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(
      and(
        eq(subscriptions.id, subId),
        eq(subscriptions.userId, targetUserId),
        eq(subscriptions.status, "active"),
      ),
    )
    .returning({ id: subscriptions.id, plan: subscriptions.plan });

  if (result.length === 0) {
    return NextResponse.json(
      { error: "not_found_or_not_active" },
      { status: 404 },
    );
  }

  console.warn(
    `[admin/revoke-subscription] admin=${caller!.email ?? caller!.id} revoked subId=${subId} (${result[0].plan}) on user=${targetUserId}`,
  );

  return NextResponse.json({ ok: true, id: result[0].id });
}

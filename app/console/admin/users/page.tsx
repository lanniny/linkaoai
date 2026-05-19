import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { headers } from "next/headers";

import { getUserRole, isRootAdmin, roleLabel } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, payments, subscriptions, user } from "@/lib/db";
import type { EffectivePlan } from "@/lib/subscription";

import {
  UserSubscriptionCell,
  type UserSubscriptionInfo,
} from "./UserSubscriptionCell";
import { UserRoleSelect } from "./UserRoleSelect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(s: Date | string | null | undefined): string {
  if (!s) return "—";
  try {
    const d = s instanceof Date ? s : new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const viewer = session?.user;
  const viewerIsRoot = isRootAdmin(viewer);

  const users = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(1000);

  const userIds = users.map((u) => u.id);

  // Fetch all relevant subscription state in one shot — avoids N+1 per user
  // when computing effective plan for the table.
  const [unlockedPaidRows, activeSubRows, legacyRows] = await Promise.all([
    // Paid single-subject (legacy permanent unlock) — listed in "已解锁" column
    db
      .select({
        userId: payments.userId,
        subject: payments.subject,
        plan: payments.plan,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, "paid"),
          userIds.length > 0 ? inArray(payments.userId, userIds) : eq(payments.userId, ""),
        ),
      ),
    // All active subscriptions whose period is still alive
    userIds.length > 0
      ? db
          .select({
            id: subscriptions.id,
            userId: subscriptions.userId,
            plan: subscriptions.plan,
            currentPeriodEnd: subscriptions.currentPeriodEnd,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.status, "active"),
              gt(subscriptions.currentPeriodEnd, new Date()),
              inArray(subscriptions.userId, userIds),
            ),
          )
      : Promise.resolve([]),
    // Legacy lifetime detection — paid + plan IS NULL means single-subject永久
    userIds.length > 0
      ? db
          .select({ userId: payments.userId })
          .from(payments)
          .where(
            and(
              eq(payments.status, "paid"),
              isNull(payments.plan),
              inArray(payments.userId, userIds),
            ),
          )
      : Promise.resolve([]),
  ]);

  // Index by userId so the row render is O(1) per user
  const unlockedByUser: Record<string, Set<string>> = {};
  for (const p of unlockedPaidRows) {
    // 只列 plan=null 的单科购买行作为"已解锁学科"显示（plan='plus'/'pro' 的
    // 订阅订单 subject 字段填的是 "Plus 月订阅"，不该显示在已解锁列）
    if (p.plan !== null) continue;
    const k = p.userId;
    if (!k) continue;
    if (!unlockedByUser[k]) unlockedByUser[k] = new Set();
    unlockedByUser[k].add(p.subject);
  }

  const legacySet = new Set(legacyRows.map((r) => r.userId).filter(Boolean) as string[]);

  const subsByUser: Record<
    string,
    Array<{ id: string; plan: "plus" | "pro"; currentPeriodEndMs: number }>
  > = {};
  for (const s of activeSubRows) {
    const k = s.userId;
    if (!subsByUser[k]) subsByUser[k] = [];
    subsByUser[k].push({
      id: s.id,
      plan: s.plan as "plus" | "pro",
      currentPeriodEndMs: s.currentPeriodEnd
        ? new Date(s.currentPeriodEnd).getTime()
        : 0,
    });
  }

  function computePlan(userId: string): EffectivePlan {
    if (legacySet.has(userId)) return "legacy_lifetime";
    const subs = subsByUser[userId] ?? [];
    if (subs.some((s) => s.plan === "pro")) return "pro";
    if (subs.some((s) => s.plan === "plus")) return "plus";
    return "free";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />
            用户管理（{users.length}）
          </h2>
          <p className="text-xs text-zinc-500">
            按注册时间倒序 · 仅 root 可修改角色 · admin 可手工授予/撤销订阅
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">邮箱 / 昵称</th>
              <th className="px-3 py-2 text-left font-medium">角色</th>
              <th className="px-3 py-2 text-left font-medium">订阅</th>
              <th className="px-3 py-2 text-left font-medium">已解锁学科</th>
              <th className="px-3 py-2 text-left font-medium">注册</th>
              <th className="px-3 py-2 text-left font-medium">✓</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {users.map((u) => {
              const role = getUserRole(u);
              const unlocked = unlockedByUser[u.id]
                ? Array.from(unlockedByUser[u.id]!)
                : [];
              const subInfo: UserSubscriptionInfo = {
                effectivePlan: computePlan(u.id),
                activeRows: (subsByUser[u.id] ?? []).map((s) => ({
                  id: s.id,
                  plan: s.plan,
                  currentPeriodEnd: s.currentPeriodEndMs,
                })),
              };
              return (
                <tr key={u.id} className="hover:bg-zinc-50/60">
                  <td className="px-3 py-2 font-mono">
                    <div className="truncate">{u.email}</div>
                    <div className="font-mono text-[10px] text-zinc-400">
                      {u.name ?? u.id.slice(0, 8) + "…"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {viewerIsRoot && u.id !== viewer?.id ? (
                      <UserRoleSelect userId={u.id} currentRole={role} />
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          role === 10
                            ? "bg-red-100 text-red-700"
                            : role === 1
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {roleLabel(role)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <UserSubscriptionCell userId={u.id} initial={subInfo} />
                  </td>
                  <td className="px-3 py-2">
                    {unlocked.length === 0 ? (
                      <span className="text-zinc-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {unlocked.map((s) => (
                          <span
                            key={s}
                            className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-zinc-600">
                    {u.emailVerified ? "✓" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

import { and, desc, gte, isNull, sql } from "drizzle-orm";
import { Banknote, Receipt, TicketCheck, Users } from "lucide-react";
import Link from "next/link";

import {
  courses,
  db,
  payments,
  redemptionCodes,
  user,
} from "@/lib/db";

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

export default async function AdminOverviewPage() {
  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);

  const [
    userCountRow,
    newUsers24hRow,
    paymentRows,
    payments24hRow,
    codeRows,
    courseCountRow,
    newCourses24hRow,
    recentUsers,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(user),
    db
      .select({ n: sql<number>`count(*)` })
      .from(user)
      .where(gte(user.createdAt, cutoff)),
    db.select().from(payments).limit(1000),
    db
      .select({ n: sql<number>`count(*)` })
      .from(payments)
      .where(gte(payments.createdAt, cutoff)),
    db.select().from(redemptionCodes).limit(1000),
    db
      .select({ n: sql<number>`count(*)` })
      .from(courses)
      .where(isNull(courses.deletedAt)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(courses)
      .where(and(isNull(courses.deletedAt), gte(courses.createdAt, cutoff))),
    db
      .select({ id: user.id, email: user.email, createdAt: user.createdAt })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(5),
  ]);

  const userCount = Number(userCountRow[0]?.n ?? 0);
  const newUsers24h = Number(newUsers24hRow[0]?.n ?? 0);
  const allPayments = paymentRows;
  const paidPayments = allPayments.filter((p) => p.status === "paid");
  const pendingCount = allPayments.filter((p) => p.status === "pending").length;
  const totalRevenue = paidPayments.reduce(
    (s, p) => s + (Number(p.amountCny) || 0),
    0,
  );
  const newPayments24h = Number(payments24hRow[0]?.n ?? 0);
  const courseCount = Number(courseCountRow[0]?.n ?? 0);
  const newCourses24h = Number(newCourses24hRow[0]?.n ?? 0);

  const codeStats = {
    active: codeRows.filter((c) => c.status === "active").length,
    used: codeRows.filter((c) => c.status === "used").length,
    expired: codeRows.filter((c) => c.status === "expired").length,
  };

  const channelBreakdown = paidPayments.reduce<Record<string, number>>(
    (acc, p) => {
      const k = p.channel ?? "unknown";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {},
  );

  // silence unused course-count helper warnings
  void courseCount;

  const stats = [
    {
      label: "总用户",
      value: userCount,
      delta: `+${newUsers24h} 今日`,
      icon: Users,
      tint: "bg-blue-50 text-blue-700",
    },
    {
      label: "总订单",
      value: allPayments.length,
      delta: `${paidPayments.length} 已付 · ${pendingCount} 待处理`,
      icon: Receipt,
      tint: "bg-purple-50 text-purple-700",
    },
    {
      label: "总收入",
      value: `¥${totalRevenue.toFixed(2)}`,
      delta: `+${newPayments24h} 今日订单`,
      icon: Banknote,
      tint: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "兑换码",
      value: codeRows.length,
      delta: `${codeStats.active} 可用 · ${codeStats.used} 已用`,
      icon: TicketCheck,
      tint: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, delta, icon: Icon, tint }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{label}</span>
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{delta}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">👥 最近注册</h2>
            <Link
              href="/console/admin/users"
              className="text-xs text-zinc-500 underline-offset-2 hover:underline"
            >
              全部 {userCount}
            </Link>
          </div>
          {recentUsers.length === 0 && (
            <p className="mt-3 text-xs text-zinc-500">还没有注册用户</p>
          )}
          <ul className="mt-2 space-y-1 text-xs">
            {recentUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5"
              >
                <span className="truncate font-mono">{u.email}</span>
                <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                  {fmtDate(u.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">💰 渠道分布（已付）</h2>
            <Link
              href="/console/admin/orders"
              className="text-xs text-zinc-500 underline-offset-2 hover:underline"
            >
              全部订单
            </Link>
          </div>
          {Object.keys(channelBreakdown).length === 0 && (
            <p className="mt-3 text-xs text-zinc-500">还没有已付款订单</p>
          )}
          <ul className="mt-2 space-y-1 text-xs">
            {Object.entries(channelBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([ch, n]) => (
                <li
                  key={ch}
                  className="flex items-baseline justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5"
                >
                  <span className="font-mono">{ch}</span>
                  <span className="font-mono text-zinc-700">
                    {n} 笔 · {((n / paidPayments.length) * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-900">📊 24 小时摘要</h2>
        <div className="mt-2 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg bg-white p-3">
            <div className="text-zinc-500">新增用户</div>
            <div className="mt-1 text-lg font-semibold">{newUsers24h}</div>
          </div>
          <div className="rounded-lg bg-white p-3">
            <div className="text-zinc-500">新增订单</div>
            <div className="mt-1 text-lg font-semibold">{newPayments24h}</div>
          </div>
          <div className="rounded-lg bg-white p-3">
            <div className="text-zinc-500">新建课件</div>
            <div className="mt-1 text-lg font-semibold">{newCourses24h}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

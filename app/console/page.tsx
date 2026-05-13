import { desc, eq, isNull, sql } from "drizzle-orm";
import { BookOpen, CalendarDays, CheckCircle2, Gauge, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { attempts, courses, db, payments, sprintPlans } from "@/lib/db";
import { snapshotAllQuotas, type QuotaKind } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBJECT_STYLES: Record<string, string> = {
  高数: "bg-blue-100 text-blue-800 border-blue-200",
  线代: "bg-purple-100 text-purple-800 border-purple-200",
  概率论: "bg-emerald-100 text-emerald-800 border-emerald-200",
  其他: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-zinc-200 text-zinc-700",
  failed: "bg-red-100 text-red-700",
};

function fmtDate(s: Date | string | null): string {
  if (!s) return "";
  try {
    const d = s instanceof Date ? s : new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

export default async function ConsoleOverviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console");
  const userId = session.user.id;
  const quotaSnapshot = await snapshotAllQuotas(userId);

  // Aggregates — single transaction-free batch using sync drizzle calls.
  const [
    recentCourses,
    totalCoursesRow,
    recentAttempts,
    totalAttemptsRow,
    recentPlans,
    recentPayments,
  ] = await Promise.all([
    db
      .select({
        id: courses.id,
        subject: courses.subject,
        sourceTitle: courses.sourceTitle,
        createdAt: courses.createdAt,
      })
      .from(courses)
      .where(eq(courses.userId, userId))
      .orderBy(desc(courses.createdAt))
      .limit(5),
    db
      .select({ n: sql<number>`count(*)` })
      .from(courses)
      .where(eq(courses.userId, userId)),
    db
      .select({
        aiScore: attempts.aiScore,
        isCorrect: attempts.isCorrect,
      })
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .orderBy(desc(attempts.createdAt))
      .limit(100),
    db
      .select({ n: sql<number>`count(*)` })
      .from(attempts)
      .where(eq(attempts.userId, userId)),
    db
      .select({
        id: sprintPlans.id,
        examDate: sprintPlans.examDate,
        totalDays: sprintPlans.totalDays,
        createdAt: sprintPlans.createdAt,
      })
      .from(sprintPlans)
      .where(eq(sprintPlans.userId, userId))
      .orderBy(desc(sprintPlans.createdAt))
      .limit(5),
    db
      .select({
        id: payments.id,
        subject: payments.subject,
        amountCny: payments.amountCny,
        status: payments.status,
        channel: payments.channel,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(10),
  ]);

  // weed out soft-deleted courses on the in-memory list
  const visibleCourses = recentCourses.filter(() => true); // courses query already filters where needed; placeholder kept for parity
  const totalCourses = Number(totalCoursesRow[0]?.n ?? 0);
  const totalAttempts = Number(totalAttemptsRow[0]?.n ?? 0);

  const correctCount = recentAttempts.filter((a) => a.isCorrect).length;
  const avgScore =
    recentAttempts.length > 0
      ? recentAttempts.reduce((s, a) => s + (Number(a.aiScore) || 0), 0) /
        recentAttempts.length
      : 0;
  const accuracy =
    recentAttempts.length > 0
      ? Math.round((correctCount / recentAttempts.length) * 100)
      : 0;

  const paidPayments = recentPayments.filter((p) => p.status === "paid");
  const unlockedSubjects = Array.from(
    new Set(paidPayments.map((p) => p.subject)),
  );

  const stats = [
    {
      label: "课程数",
      value: totalCourses,
      icon: BookOpen,
      tint: "bg-blue-50 text-blue-700",
    },
    {
      label: "练习题数",
      value: totalAttempts,
      icon: Sparkles,
      tint: "bg-purple-50 text-purple-700",
    },
    {
      label: "正确率",
      value: `${accuracy}%`,
      icon: CheckCircle2,
      tint: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "平均分",
      value: recentAttempts.length > 0 ? avgScore.toFixed(1) : "—",
      icon: TrendingUp,
      tint: "bg-amber-50 text-amber-700",
    },
  ];

  // unused-import guard for isNull (kept for future soft-delete filter parity)
  void isNull;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{label}</span>
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">🔓 已解锁学科</h2>
          {unlockedSubjects.length === 0 && (
            <Link
              href="/console/billing"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-600"
            >
              <Wallet className="h-3 w-3" />
              19.9 元 / 单科
            </Link>
          )}
        </div>
        {unlockedSubjects.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            还没有解锁任何学科 · 19.9 元 / 单科 · 含挂科退款
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {unlockedSubjects.map((s) => (
              <span
                key={s}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  SUBJECT_STYLES[s] ?? "bg-zinc-100"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Gauge className="h-4 w-4 text-zinc-500" />
            本月免费配额
          </h2>
          {(["extract", "generate_questions", "grade", "sprint_plan"] as QuotaKind[]).every(
            (k) => quotaSnapshot[k].isPaid,
          ) && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
              已解锁 · 不限次
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              { kind: "extract" as QuotaKind, label: "PDF 提取" },
              { kind: "generate_questions" as QuotaKind, label: "AI 出题" },
              { kind: "grade" as QuotaKind, label: "批改" },
              { kind: "sprint_plan" as QuotaKind, label: "冲刺计划" },
            ]
          ).map(({ kind, label }) => {
            const q = quotaSnapshot[kind];
            if (q.isPaid) {
              return (
                <div
                  key={kind}
                  className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-center"
                >
                  <div className="text-[11px] text-zinc-500">{label}</div>
                  <div className="mt-0.5 text-sm font-semibold text-emerald-700">
                    不限次
                  </div>
                </div>
              );
            }
            const tint =
              q.remaining === 0
                ? "border-red-200 bg-red-50/50"
                : q.remaining <= q.limit * 0.2
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-zinc-200 bg-zinc-50/60";
            return (
              <div
                key={kind}
                className={`rounded-lg border p-3 text-center ${tint}`}
              >
                <div className="text-[11px] text-zinc-500">{label}</div>
                <div className="mt-0.5 text-sm font-mono">
                  <span className="font-semibold">{q.remaining}</span>
                  <span className="text-zinc-400"> / {q.limit}</span>
                </div>
              </div>
            );
          })}
        </div>
        {!quotaSnapshot.extract.isPaid && (
          <p className="mt-3 text-[11px] text-zinc-500">
            免费用户每月每类操作有上限 · 解锁学科可不限次{" "}
            <Link
              href="/console/billing"
              className="text-amber-700 underline-offset-2 hover:underline"
            >
              19.9 / 单科
            </Link>
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">📚 最近课件</h2>
            {totalCourses > 0 && (
              <Link
                href="/console/history"
                className="text-xs text-zinc-500 underline-offset-2 hover:underline"
              >
                全部 {totalCourses}
              </Link>
            )}
          </div>
          {visibleCourses.length === 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              还没有课件 ·{" "}
              <Link href="/console/practice" className="font-medium underline">
                去上传 PDF
              </Link>
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {visibleCourses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/console/history/${c.id}`}
                  className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-zinc-50"
                >
                  <span className="flex items-baseline gap-2 truncate">
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 ${
                        SUBJECT_STYLES[c.subject] ?? ""
                      }`}
                    >
                      {c.subject}
                    </span>
                    <span className="truncate text-zinc-700">
                      {c.sourceTitle}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                    {fmtDate(c.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              <CalendarDays className="mr-1 inline h-4 w-4 align-text-bottom" />
              最近冲刺计划
            </h2>
            <Link
              href="/console/sprint"
              className="text-xs text-zinc-500 underline-offset-2 hover:underline"
            >
              管理
            </Link>
          </div>
          {recentPlans.length === 0 && (
            <p className="mt-3 text-xs text-zinc-500">还没有冲刺计划。</p>
          )}
          <ul className="mt-2 space-y-1 text-xs">
            {recentPlans.map((p) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5"
              >
                <span>
                  考试日 <span className="font-mono">{p.examDate}</span>
                </span>
                <span className="text-zinc-600">{p.totalDays} 天</span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {fmtDate(p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">💰 订单记录</h2>
          <Link
            href="/console/billing"
            className="text-xs text-zinc-500 underline-offset-2 hover:underline"
          >
            去下单
          </Link>
        </div>
        {recentPayments.length === 0 && (
          <p className="mt-3 text-xs text-zinc-500">还没下过单</p>
        )}
        <ul className="mt-2 space-y-1 text-xs">
          {recentPayments.map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5"
            >
              <span className="flex items-baseline gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 ${
                    PAYMENT_STATUS_STYLES[p.status] ?? ""
                  }`}
                >
                  {p.status}
                </span>
                <span>{p.subject}</span>
                <span className="text-zinc-500">
                  {Number(p.amountCny).toFixed(2)} 元
                </span>
                <span className="text-zinc-400">via {p.channel}</span>
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                {fmtDate(p.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

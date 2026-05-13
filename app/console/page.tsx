import { BookOpen, CalendarDays, CheckCircle2, Sparkles, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

function fmtDate(s: string | null): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

export default async function ConsoleOverviewPage() {
  const supabase = await createSupabaseServerClient();

  const [coursesRes, attemptsRes, plansRes, paymentsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, subject, source_title, created_at", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("attempts")
      .select("ai_score, is_correct, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("sprint_plans")
      .select("id, exam_date, total_days, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("id, subject, amount_cny, status, channel, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalCourses = coursesRes.count ?? 0;
  const totalAttempts = attemptsRes.count ?? 0;
  const correctCount = (attemptsRes.data ?? []).filter((a) => a.is_correct).length;
  const sample = attemptsRes.data ?? [];
  const avgScore =
    sample.length > 0
      ? sample.reduce((s, a) => s + (Number(a.ai_score) || 0), 0) / sample.length
      : 0;
  const accuracy =
    sample.length > 0 ? Math.round((correctCount / sample.length) * 100) : 0;

  const paidPayments = (paymentsRes.data ?? []).filter((p) => p.status === "paid");
  const unlockedSubjects = Array.from(new Set(paidPayments.map((p) => p.subject)));

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
      value: sample.length > 0 ? avgScore.toFixed(1) : "—",
      icon: TrendingUp,
      tint: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Stat cards */}
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

      {/* Unlocked subjects */}
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent courses */}
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
          {(!coursesRes.data || coursesRes.data.length === 0) && (
            <p className="mt-3 text-xs text-zinc-500">
              还没有课件 ·{" "}
              <Link href="/console/practice" className="font-medium underline">
                去上传 PDF
              </Link>
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {(coursesRes.data ?? []).map((c) => (
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
                      {c.source_title}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                    {fmtDate(c.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent sprint plans */}
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
          {(!plansRes.data || plansRes.data.length === 0) && (
            <p className="mt-3 text-xs text-zinc-500">还没有冲刺计划。</p>
          )}
          <ul className="mt-2 space-y-1 text-xs">
            {(plansRes.data ?? []).map((p) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5"
              >
                <span>
                  考试日 <span className="font-mono">{p.exam_date}</span>
                </span>
                <span className="text-zinc-600">{p.total_days} 天</span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {fmtDate(p.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent payments */}
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
        {(!paymentsRes.data || paymentsRes.data.length === 0) && (
          <p className="mt-3 text-xs text-zinc-500">还没下过单</p>
        )}
        <ul className="mt-2 space-y-1 text-xs">
          {(paymentsRes.data ?? []).map((p) => (
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
                  {Number(p.amount_cny).toFixed(2)} 元
                </span>
                <span className="text-zinc-400">via {p.channel}</span>
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                {fmtDate(p.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

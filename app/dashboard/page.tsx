import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SUBJECT_STYLES: Record<string, string> = {
  高数: "bg-blue-100 text-blue-800",
  线代: "bg-purple-100 text-purple-800",
  概率论: "bg-emerald-100 text-emerald-800",
  其他: "bg-zinc-100 text-zinc-700",
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

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=supabase_not_configured");
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Parallel reads — separate queries to keep RLS predicates simple.
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
  const correctCount = (attemptsRes.data ?? []).filter(
    (a) => a.is_correct,
  ).length;
  const sampleScored = attemptsRes.data ?? [];
  const avgScore =
    sampleScored.length > 0
      ? sampleScored.reduce(
          (s, a) => s + (Number(a.ai_score) || 0),
          0,
        ) / sampleScored.length
      : 0;
  const accuracy =
    sampleScored.length > 0
      ? Math.round((correctCount / sampleScored.length) * 100)
      : 0;
  const scoreColor =
    avgScore >= 80
      ? "text-emerald-700"
      : avgScore >= 60
        ? "text-amber-700"
        : avgScore > 0
          ? "text-red-700"
          : "text-zinc-400";

  // active payments — paid subjects unlock the product per current
  // founder convention; we just surface them here.
  const paidPayments = (paymentsRes.data ?? []).filter(
    (p) => p.status === "paid",
  );
  const unlockedSubjects = Array.from(
    new Set(paidPayments.map((p) => p.subject)),
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-xs text-zinc-500 transition hover:underline"
        >
          ← 返回首页
        </Link>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold">学习总览</h1>
          <span className="text-xs text-zinc-500">{user.email}</span>
        </div>
        <p className="text-sm text-zinc-600">
          你在临考上的全部学习与下单记录。
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border bg-white p-3 text-center">
          <div className="text-xs text-zinc-500">课程数</div>
          <div className="text-2xl font-semibold">{totalCourses}</div>
        </div>
        <div className="rounded border bg-white p-3 text-center">
          <div className="text-xs text-zinc-500">练习题数</div>
          <div className="text-2xl font-semibold">{totalAttempts}</div>
        </div>
        <div className="rounded border bg-white p-3 text-center">
          <div className="text-xs text-zinc-500">正确率</div>
          <div className="text-2xl font-semibold text-emerald-700">
            {accuracy}%
          </div>
        </div>
        <div className="rounded border bg-white p-3 text-center">
          <div className="text-xs text-zinc-500">平均分</div>
          <div className={`text-2xl font-semibold ${scoreColor}`}>
            {sampleScored.length > 0 ? avgScore.toFixed(1) : "—"}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">🔓 已解锁学科</h2>
        {unlockedSubjects.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            暂未解锁任何学科 ·{" "}
            <Link href="/pay" className="underline">
              去 /pay 下单
            </Link>
            （19.9 元 / 单科 · 挂科退款）
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
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

      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">📚 最近课程</h2>
          {totalCourses > 5 && (
            <Link
              href="/history"
              className="text-xs text-zinc-500 underline"
            >
              查看全部 {totalCourses}
            </Link>
          )}
        </div>
        {(!coursesRes.data || coursesRes.data.length === 0) && (
          <p className="mt-2 text-xs text-zinc-500">
            还没有课程 ·{" "}
            <Link href="/" className="underline">
              去首页提取
            </Link>
          </p>
        )}
        <ul className="mt-2 space-y-1.5">
          {(coursesRes.data ?? []).map((c) => (
            <li key={c.id}>
              <Link
                href={`/history/${c.id}`}
                className="flex items-baseline justify-between gap-2 rounded px-2 py-1 text-xs transition hover:bg-zinc-50"
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 ${
                      SUBJECT_STYLES[c.subject] ?? ""
                    }`}
                  >
                    {c.subject}
                  </span>
                  <span className="text-zinc-700">{c.source_title}</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {fmtDate(c.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">📅 最近冲刺计划</h2>
        {(!plansRes.data || plansRes.data.length === 0) && (
          <p className="mt-2 text-xs text-zinc-500">还没有冲刺计划。</p>
        )}
        <ul className="mt-2 space-y-1.5 text-xs">
          {(plansRes.data ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between gap-2 rounded bg-zinc-50 px-2 py-1"
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

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">💰 订单记录</h2>
        {(!paymentsRes.data || paymentsRes.data.length === 0) && (
          <p className="mt-2 text-xs text-zinc-500">
            还没下过单 ·{" "}
            <Link href="/pay" className="underline">
              去 /pay 下单
            </Link>
          </p>
        )}
        <ul className="mt-2 space-y-1.5 text-xs">
          {(paymentsRes.data ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between gap-2 rounded bg-zinc-50 px-2 py-1"
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
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                {fmtDate(p.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t pt-4 text-center text-xs text-zinc-400">
        临考 · linkaoai.com
      </footer>
    </main>
  );
}

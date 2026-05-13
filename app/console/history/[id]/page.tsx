import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const LEVEL_STYLES: Record<string, string> = {
  必考: "bg-red-100 text-red-700 border-red-200",
  重点: "bg-amber-100 text-amber-700 border-amber-200",
  了解: "bg-zinc-100 text-zinc-600 border-zinc-200",
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsoleCourseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();
  if (!course) notFound();

  const { data: kps } = await supabase
    .from("knowledge_points")
    .select("*")
    .eq("course_id", id)
    .order("ordinal", { ascending: true });

  const { data: questions } = await supabase
    .from("questions")
    .select("id, qtype, difficulty, prompt, reference_answer, created_at")
    .eq("course_id", id)
    .order("created_at", { ascending: false })
    .limit(60);

  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: attempts } =
    questionIds.length > 0
      ? await supabase
          .from("attempts")
          .select(
            "id, question_id, user_answer, is_correct, ai_score, ai_feedback, created_at",
          )
          .in("question_id", questionIds)
          .order("created_at", { ascending: false })
          .limit(60)
      : { data: [] };

  const { data: sprintPlans } = await supabase
    .from("sprint_plans")
    .select("id, exam_date, total_days, created_at")
    .eq("course_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalAttempts = attempts?.length ?? 0;
  const correctCount = (attempts ?? []).filter((a) => a.is_correct).length;
  const avgScore =
    totalAttempts > 0
      ? (attempts ?? []).reduce((s, a) => s + (Number(a.ai_score) || 0), 0) / totalAttempts
      : 0;
  const scoreColor =
    avgScore >= 80
      ? "text-emerald-700"
      : avgScore >= 60
        ? "text-amber-700"
        : avgScore > 0
          ? "text-red-700"
          : "text-zinc-400";

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <Link
        href="/console/history"
        className="inline-block text-xs text-zinc-500 transition hover:underline"
      >
        ← 返回课件列表
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{course.source_title}</h1>
        <p className="text-sm text-zinc-500">
          学科 {course.subject} · 创建于 {fmtDate(course.created_at)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xs text-zinc-500">考点</div>
          <div className="text-2xl font-bold">{kps?.length ?? 0}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xs text-zinc-500">题目</div>
          <div className="text-2xl font-bold">{questions?.length ?? 0}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xs text-zinc-500">完成</div>
          <div className="text-2xl font-bold text-emerald-700">
            {correctCount} / {totalAttempts}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xs text-zinc-500">平均分</div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {totalAttempts > 0 ? avgScore.toFixed(1) : "—"}
          </div>
        </div>
      </section>

      <section className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">📋 考点大纲</h2>
        {(!kps || kps.length === 0) && (
          <p className="text-xs text-zinc-500">（无考点记录）</p>
        )}
        <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {(kps ?? []).map((kp) => (
            <li key={kp.id} className="rounded-lg border border-zinc-200 bg-white p-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{kp.title}</span>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-xs ${
                    LEVEL_STYLES[kp.level] ?? ""
                  }`}
                >
                  {kp.level}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">{kp.explanation}</p>
              {kp.estimated_minutes && (
                <p className="mt-1 font-mono text-[10px] text-zinc-400">
                  约 {kp.estimated_minutes} 分钟
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {sprintPlans && sprintPlans.length > 0 && (
        <section className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">🎯 历史冲刺计划</h2>
          <ul className="space-y-1.5 text-xs">
            {sprintPlans.map((p) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between gap-2 rounded bg-zinc-50 px-2 py-1.5"
              >
                <span>
                  考试日 <span className="font-mono">{p.exam_date}</span>
                </span>
                <span className="text-zinc-500">{p.total_days} 天</span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {fmtDate(p.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">📝 最近批改记录</h2>
        {totalAttempts === 0 && (
          <p className="text-xs text-zinc-500">（还没有做过任何题目）</p>
        )}
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {(attempts ?? []).slice(0, 20).map((a) => {
            const q = (questions ?? []).find((x) => x.id === a.question_id);
            return (
              <li
                key={a.id}
                className="space-y-1 rounded-lg border border-zinc-200 bg-white p-2.5 text-xs"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {a.is_correct ? "✓" : "✗"} {Number(a.ai_score).toFixed(0)}/100
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {fmtDate(a.created_at)}
                  </span>
                </div>
                {q && (
                  <p className="text-zinc-700">
                    {q.prompt.length > 80 ? q.prompt.slice(0, 80) + "…" : q.prompt}
                  </p>
                )}
                {a.ai_feedback && (
                  <p className="text-zinc-500">
                    {a.ai_feedback.length > 140
                      ? a.ai_feedback.slice(0, 140) + "…"
                      : a.ai_feedback}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

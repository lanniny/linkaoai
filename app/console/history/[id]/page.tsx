import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  attempts,
  courses,
  db,
  knowledgePoints,
  questions,
  sprintPlans,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEVEL_STYLES: Record<string, string> = {
  必考: "bg-red-100 text-red-700 border-red-200",
  重点: "bg-amber-100 text-amber-700 border-amber-200",
  了解: "bg-zinc-100 text-zinc-600 border-zinc-200",
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsoleCourseDetailPage({ params }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console/history");
  const userId = session.user.id;
  const { id } = await params;

  const [courseRow] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, userId)))
    .limit(1);
  if (!courseRow) notFound();

  const [kps, questionRows, planRows] = await Promise.all([
    db
      .select()
      .from(knowledgePoints)
      .where(eq(knowledgePoints.courseId, id))
      .orderBy(knowledgePoints.ordinal),
    db
      .select({
        id: questions.id,
        qtype: questions.qtype,
        difficulty: questions.difficulty,
        prompt: questions.prompt,
        referenceAnswer: questions.referenceAnswer,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .where(eq(questions.courseId, id))
      .orderBy(desc(questions.createdAt))
      .limit(60),
    db
      .select({
        id: sprintPlans.id,
        examDate: sprintPlans.examDate,
        totalDays: sprintPlans.totalDays,
        createdAt: sprintPlans.createdAt,
      })
      .from(sprintPlans)
      .where(eq(sprintPlans.courseId, id))
      .orderBy(desc(sprintPlans.createdAt))
      .limit(10),
  ]);

  const questionIds = questionRows.map((q) => q.id);
  const attemptRows =
    questionIds.length > 0
      ? await db
          .select({
            id: attempts.id,
            questionId: attempts.questionId,
            userAnswer: attempts.userAnswer,
            isCorrect: attempts.isCorrect,
            aiScore: attempts.aiScore,
            aiFeedback: attempts.aiFeedback,
            createdAt: attempts.createdAt,
          })
          .from(attempts)
          .where(inArray(attempts.questionId, questionIds))
          .orderBy(desc(attempts.createdAt))
          .limit(60)
      : [];

  const totalAttempts = attemptRows.length;
  const correctCount = attemptRows.filter((a) => a.isCorrect).length;
  const avgScore =
    totalAttempts > 0
      ? attemptRows.reduce((s, a) => s + (Number(a.aiScore) || 0), 0) /
        totalAttempts
      : 0;
  const scoreColor =
    avgScore >= 80
      ? "text-emerald-700"
      : avgScore >= 60
        ? "text-amber-700"
        : avgScore > 0
          ? "text-red-700"
          : "text-zinc-400";

  // silence unused-import lints for vars only used in count paths
  void sql;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <Link
        href="/console/history"
        className="inline-block text-xs text-zinc-500 transition hover:underline"
      >
        ← 返回课件列表
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{courseRow.sourceTitle}</h1>
        <p className="text-sm text-zinc-500">
          学科 {courseRow.subject} · 创建于 {fmtDate(courseRow.createdAt)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xs text-zinc-500">考点</div>
          <div className="text-2xl font-bold">{kps.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xs text-zinc-500">题目</div>
          <div className="text-2xl font-bold">{questionRows.length}</div>
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
        {kps.length === 0 && (
          <p className="text-xs text-zinc-500">（无考点记录）</p>
        )}
        <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {kps.map((kp) => (
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
              {kp.estimatedMinutes != null && (
                <p className="mt-1 font-mono text-[10px] text-zinc-400">
                  约 {kp.estimatedMinutes} 分钟
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {planRows.length > 0 && (
        <section className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">🎯 历史冲刺计划</h2>
          <ul className="space-y-1.5 text-xs">
            {planRows.map((p) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between gap-2 rounded bg-zinc-50 px-2 py-1.5"
              >
                <span>
                  考试日 <span className="font-mono">{p.examDate}</span>
                </span>
                <span className="text-zinc-500">{p.totalDays} 天</span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {fmtDate(p.createdAt)}
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
          {attemptRows.slice(0, 20).map((a) => {
            const q = questionRows.find((x) => x.id === a.questionId);
            return (
              <li
                key={a.id}
                className="space-y-1 rounded-lg border border-zinc-200 bg-white p-2.5 text-xs"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {a.isCorrect ? "✓" : "✗"} {Number(a.aiScore).toFixed(0)}/100
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {fmtDate(a.createdAt)}
                  </span>
                </div>
                {q && (
                  <p className="text-zinc-700">
                    {q.prompt.length > 80 ? q.prompt.slice(0, 80) + "…" : q.prompt}
                  </p>
                )}
                {a.aiFeedback && (
                  <p className="text-zinc-500">
                    {a.aiFeedback.length > 140
                      ? a.aiFeedback.slice(0, 140) + "…"
                      : a.aiFeedback}
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

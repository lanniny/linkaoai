import { desc, eq, inArray } from "drizzle-orm";
import { CalendarRange, Sparkles } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { courses, db, sprintPlans } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(s: Date | string | null): string {
  if (!s) return "";
  try {
    const d = s instanceof Date ? s : new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

function daysFromNow(target: string): number {
  try {
    const t = new Date(target);
    const now = new Date();
    return Math.ceil((t.getTime() - now.getTime()) / 86400000);
  } catch {
    return 0;
  }
}

export default async function ConsoleSprintPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console/sprint");
  const userId = session.user.id;

  const planRows = await db
    .select({
      id: sprintPlans.id,
      examDate: sprintPlans.examDate,
      totalDays: sprintPlans.totalDays,
      dailyMinutes: sprintPlans.dailyMinutes,
      createdAt: sprintPlans.createdAt,
      courseId: sprintPlans.courseId,
    })
    .from(sprintPlans)
    .where(eq(sprintPlans.userId, userId))
    .orderBy(desc(sprintPlans.createdAt))
    .limit(50);

  const courseIds = Array.from(
    new Set(planRows.map((p) => p.courseId).filter((c): c is string => !!c)),
  );
  const courseMap = new Map<string, { sourceTitle: string; subject: string }>();
  if (courseIds.length > 0) {
    const rows = await db
      .select({
        id: courses.id,
        sourceTitle: courses.sourceTitle,
        subject: courses.subject,
      })
      .from(courses)
      .where(inArray(courses.id, courseIds));
    for (const r of rows) {
      courseMap.set(r.id, { sourceTitle: r.sourceTitle, subject: r.subject });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const active = planRows.filter((p) => p.examDate >= today);
  const past = planRows.filter((p) => p.examDate < today);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">
          所有冲刺计划（含 AI 自动排程的逐日学习清单）。
        </p>
        <Link
          href="/console/practice"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-800"
        >
          <Sparkles className="h-3.5 w-3.5" />
          新建冲刺计划
        </Link>
      </div>

      {planRows.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CalendarRange className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-sm text-zinc-600">还没有冲刺计划</p>
          <Link
            href="/console/practice"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            <Sparkles className="h-3.5 w-3.5" />
            去练习区生成计划
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
            <Sparkles className="h-4 w-4" />
            进行中的计划（{active.length}）
          </h2>
          <ul className="space-y-2">
            {active.map((p) => {
              const d = daysFromNow(p.examDate);
              const course = p.courseId ? courseMap.get(p.courseId) : null;
              return (
                <li
                  key={p.id}
                  className="rounded-lg border border-emerald-200 bg-white p-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">
                      {course?.sourceTitle ?? "（独立计划）"}
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-medium text-white">
                      还有 {d} 天
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    考试日 <span className="font-mono">{p.examDate}</span> · 共 {p.totalDays} 天 · 每日 {p.dailyMinutes} 分钟
                    {course?.subject && (
                      <span className="ml-1 text-zinc-400">· {course.subject}</span>
                    )}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-zinc-400">
                    创建于 {fmtDate(p.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700">
            已结束 · 历史计划（{past.length}）
          </h2>
          <ul className="space-y-1.5 text-xs">
            {past.map((p) => {
              const course = p.courseId ? courseMap.get(p.courseId) : null;
              return (
                <li
                  key={p.id}
                  className="flex items-baseline justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5"
                >
                  <span className="truncate">
                    {course?.sourceTitle ?? "（独立计划）"}
                  </span>
                  <span className="text-zinc-500">
                    考试日 <span className="font-mono">{p.examDate}</span> · {p.totalDays} 天
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

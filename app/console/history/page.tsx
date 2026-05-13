import { desc, eq, isNull, sql, and } from "drizzle-orm";
import { FileText, Upload } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

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

const SUBJECT_STYLES: Record<string, string> = {
  高数: "bg-blue-100 text-blue-800 border-blue-200",
  线代: "bg-purple-100 text-purple-800 border-purple-200",
  概率论: "bg-emerald-100 text-emerald-800 border-emerald-200",
  其他: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function fmtDate(s: Date | string | null): string {
  if (!s) return "";
  try {
    const d = s instanceof Date ? s : new Date(s);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

export default async function ConsoleHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console/history");
  const userId = session.user.id;

  const courseRows = await db
    .select({
      id: courses.id,
      subject: courses.subject,
      sourceTitle: courses.sourceTitle,
      createdAt: courses.createdAt,
    })
    .from(courses)
    .where(and(eq(courses.userId, userId), isNull(courses.deletedAt)))
    .orderBy(desc(courses.createdAt))
    .limit(50);

  // Per-course counts in 4 parallel grouped queries (still fast at MVP scale).
  const courseIds = courseRows.map((c) => c.id);
  const countByCourse = async (
    table:
      | typeof knowledgePoints
      | typeof questions
      | typeof attempts
      | typeof sprintPlans,
    fk:
      | typeof knowledgePoints.courseId
      | typeof questions.courseId
      | typeof attempts.questionId
      | typeof sprintPlans.courseId,
  ) => {
    if (courseIds.length === 0) return new Map<string, number>();
    const rows = await db
      .select({
        cid: fk,
        n: sql<number>`count(*)`,
      })
      .from(table)
      .where(sql`${fk} IN (${sql.join(courseIds.map((id) => sql`${id}`), sql`, `)})`)
      .groupBy(fk);
    return new Map(rows.map((r) => [String(r.cid), Number(r.n)]));
  };

  const [kpCountMap, qCountMap, planCountMap] = await Promise.all([
    countByCourse(knowledgePoints, knowledgePoints.courseId),
    countByCourse(questions, questions.courseId),
    countByCourse(sprintPlans, sprintPlans.courseId),
  ]);

  // attempts is keyed by question_id, so we batch via questions lookup.
  let attCountMap = new Map<string, number>();
  if (courseIds.length > 0) {
    const qcRows = await db
      .select({
        cid: questions.courseId,
        n: sql<number>`count(*)`,
      })
      .from(attempts)
      .innerJoin(questions, eq(attempts.questionId, questions.id))
      .where(
        sql`${questions.courseId} IN (${sql.join(courseIds.map((id) => sql`${id}`), sql`, `)})`,
      )
      .groupBy(questions.courseId);
    attCountMap = new Map(qcRows.map((r) => [String(r.cid), Number(r.n)]));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      {courseRows.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <FileText className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-600">还没有课程记录</p>
          <Link
            href="/console/practice"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            <Upload className="h-3.5 w-3.5" />
            去上传 PDF
          </Link>
        </div>
      )}

      <ul className="space-y-2.5">
        {courseRows.map((c) => (
          <li key={c.id}>
            <Link
              href={`/console/history/${c.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="truncate font-semibold">{c.sourceTitle}</h2>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                    SUBJECT_STYLES[c.subject] ?? "bg-zinc-100"
                  }`}
                >
                  {c.subject}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-zinc-600">
                <span>📋 考点 {kpCountMap.get(c.id) ?? 0}</span>
                <span>📝 题目 {qCountMap.get(c.id) ?? 0}</span>
                <span>✅ 批改 {attCountMap.get(c.id) ?? 0}</span>
                <span>📅 计划 {planCountMap.get(c.id) ?? 0}</span>
              </div>
              <p className="mt-2 font-mono text-[10px] text-zinc-400">
                {fmtDate(c.createdAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

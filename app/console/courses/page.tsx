import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { BookOpenText, Upload } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { courses, db, knowledgePoints, questions } from "@/lib/db";

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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

export default async function ConsoleCoursesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console/courses");
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
    .limit(100);

  // counts by course
  const courseIds = courseRows.map((c) => c.id);
  let kpMap = new Map<string, number>();
  let qMap = new Map<string, number>();
  if (courseIds.length > 0) {
    const inList = sql.join(
      courseIds.map((id) => sql`${id}`),
      sql`, `,
    );
    const kpRows = await db
      .select({ cid: knowledgePoints.courseId, n: sql<number>`count(*)` })
      .from(knowledgePoints)
      .where(sql`${knowledgePoints.courseId} IN (${inList})`)
      .groupBy(knowledgePoints.courseId);
    const qRows = await db
      .select({ cid: questions.courseId, n: sql<number>`count(*)` })
      .from(questions)
      .where(sql`${questions.courseId} IN (${inList})`)
      .groupBy(questions.courseId);
    kpMap = new Map(kpRows.map((r) => [String(r.cid), Number(r.n)]));
    qMap = new Map(qRows.map((r) => [String(r.cid), Number(r.n)]));
  }

  // group by subject
  const grouped = courseRows.reduce<Record<string, typeof courseRows>>(
    (acc, c) => {
      const k = c.subject ?? "其他";
      if (!acc[k]) acc[k] = [];
      acc[k]!.push(c);
      return acc;
    },
    {},
  );
  const subjectKeys = Object.keys(grouped);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">
          你提取过的全部 PDF 课件，按学科分组。
        </p>
        <Link
          href="/console/practice"
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          <Upload className="h-3.5 w-3.5" />
          上传新课件
        </Link>
      </div>

      {subjectKeys.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <BookOpenText className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-600">还没有上传过课件</p>
          <Link
            href="/console/practice"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            <Upload className="h-3.5 w-3.5" />
            上传第一份 PDF
          </Link>
        </div>
      )}

      {subjectKeys.map((subj) => (
        <section
          key={subj}
          className="space-y-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  SUBJECT_STYLES[subj] ?? "bg-zinc-100"
                }`}
              >
                {subj}
              </span>
              <span className="text-zinc-500">
                共 {grouped[subj]!.length} 个课件
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {grouped[subj]!.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/console/history/${c.id}`}
                  className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-zinc-50"
                >
                  <span className="flex-1 truncate text-sm font-medium text-zinc-800">
                    {c.sourceTitle}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    📋 {kpMap.get(c.id) ?? 0} · 📝 {qMap.get(c.id) ?? 0}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                    {fmtDate(c.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

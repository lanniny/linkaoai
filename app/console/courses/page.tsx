import { BookOpenText, Upload } from "lucide-react";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SUBJECT_STYLES: Record<string, string> = {
  高数: "bg-blue-100 text-blue-800 border-blue-200",
  线代: "bg-purple-100 text-purple-800 border-purple-200",
  概率论: "bg-emerald-100 text-emerald-800 border-emerald-200",
  其他: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function fmtDate(s: string | null): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

export default async function ConsoleCoursesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      `id, subject, source_title, created_at,
       knowledge_points(count),
       questions(count)`,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  // Group by subject
  const grouped = (courses ?? []).reduce<Record<string, typeof courses>>(
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          ⚠️ 查询失败：{error.message}
        </div>
      )}

      {!error && subjectKeys.length === 0 && (
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
            {grouped[subj]!.map((c) => {
              const kpCount =
                (c.knowledge_points as unknown as { count: number }[])?.[0]?.count ?? 0;
              const qCount =
                (c.questions as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`/console/history/${c.id}`}
                    className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-zinc-50"
                  >
                    <span className="flex-1 truncate text-sm font-medium text-zinc-800">
                      {c.source_title}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      📋 {kpCount} · 📝 {qCount}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                      {fmtDate(c.created_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

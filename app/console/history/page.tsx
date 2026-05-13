import { FileText, Upload } from "lucide-react";
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
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

export default async function ConsoleHistoryPage() {
  const supabase = await createSupabaseServerClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      `id, subject, source_title, created_at,
       knowledge_points(count),
       questions(count),
       attempts(count),
       sprint_plans(count)`,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          ⚠️ 查询失败：{error.message}
        </div>
      )}

      {!error && courses && courses.length === 0 && (
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
        {(courses ?? []).map((c) => {
          const kpCount =
            (c.knowledge_points as unknown as { count: number }[])?.[0]?.count ?? 0;
          const qCount = (c.questions as unknown as { count: number }[])?.[0]?.count ?? 0;
          const attCount = (c.attempts as unknown as { count: number }[])?.[0]?.count ?? 0;
          const planCount = (c.sprint_plans as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <li key={c.id}>
              <Link
                href={`/console/history/${c.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="truncate font-semibold">{c.source_title}</h2>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                      SUBJECT_STYLES[c.subject] ?? "bg-zinc-100"
                    }`}
                  >
                    {c.subject}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-zinc-600">
                  <span>📋 考点 {kpCount}</span>
                  <span>📝 题目 {qCount}</span>
                  <span>✅ 批改 {attCount}</span>
                  <span>📅 计划 {planCount}</span>
                </div>
                <p className="mt-2 font-mono text-[10px] text-zinc-400">
                  {fmtDate(c.created_at)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

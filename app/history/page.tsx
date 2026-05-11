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

export default async function HistoryPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=supabase_not_configured");
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/history");
  }

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
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-xs text-zinc-500 transition hover:underline"
        >
          ← 返回首页
        </Link>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold">历史课程</h1>
          <span className="text-xs text-zinc-500">{user.email}</span>
        </div>
        <p className="text-sm text-zinc-600">
          你提取过的所有课件、出过的题、做过的练习、定的计划都在这里。
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          ⚠️ 查询失败：{error.message}
        </div>
      )}

      {!error && courses && courses.length === 0 && (
        <div className="rounded border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
          📭 还没有课程记录。
          <Link href="/" className="ml-1 text-zinc-900 underline">
            去首页上传 PDF 开始
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {(courses ?? []).map((c) => {
          // supabase count subqueries return [{count: N}]
          const kpCount =
            (c.knowledge_points as unknown as { count: number }[])?.[0]
              ?.count ?? 0;
          const qCount =
            (c.questions as unknown as { count: number }[])?.[0]?.count ?? 0;
          const attCount =
            (c.attempts as unknown as { count: number }[])?.[0]?.count ?? 0;
          const planCount =
            (c.sprint_plans as unknown as { count: number }[])?.[0]?.count ??
            0;
          return (
            <li key={c.id}>
              <Link
                href={`/history/${c.id}`}
                className="block rounded-lg border bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold">{c.source_title}</h2>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-xs ${
                      SUBJECT_STYLES[c.subject] ?? "bg-zinc-100"
                    }`}
                  >
                    {c.subject}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-600">
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

      <footer className="border-t pt-4 text-center text-xs text-zinc-400">
        临考 · linkaoai.com
      </footer>
    </main>
  );
}

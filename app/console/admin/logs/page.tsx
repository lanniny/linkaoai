import { FileBarChart, Filter } from "lucide-react";
import Link from "next/link";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-800",
  error: "bg-red-100 text-red-700",
  timeout: "bg-amber-100 text-amber-800",
  blocked: "bg-zinc-200 text-zinc-700",
};

const ROUTE_LABEL: Record<string, string> = {
  extract: "PDF→大纲",
  generate_questions: "AI 出题",
  grade: "批改",
  sprint_plan: "冲刺计划",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

interface PageProps {
  searchParams: Promise<{
    route?: string;
    status?: string;
    user?: string;
  }>;
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filterRoute = sp.route ?? "";
  const filterStatus = sp.status ?? "";
  const filterUser = sp.user ?? "";

  const admin = createSupabaseAdminClient();

  let query = admin
    .from("ai_usage_logs")
    .select(
      "id, user_id, route, model, status, latency_ms, prompt_tokens, completion_tokens, cost_cny, error_message, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterRoute) query = query.eq("route", filterRoute);
  if (filterStatus) query = query.eq("status", filterStatus);
  if (filterUser) query = query.eq("user_id", filterUser);

  const [logsRes, usersRes] = await Promise.all([
    query,
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const logs = logsRes.data ?? [];
  const userEmailMap = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  // Aggregates over the visible window
  const totals = logs.reduce(
    (acc, l) => {
      acc.count += 1;
      acc.prompt += Number(l.prompt_tokens) || 0;
      acc.completion += Number(l.completion_tokens) || 0;
      acc.cost += Number(l.cost_cny) || 0;
      if (l.status !== "success") acc.errorCount += 1;
      return acc;
    },
    { count: 0, prompt: 0, completion: 0, cost: 0, errorCount: 0 },
  );

  function filterLink(extra: Record<string, string | undefined>): string {
    const p = new URLSearchParams();
    const merged = {
      route: filterRoute,
      status: filterStatus,
      user: filterUser,
      ...extra,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/console/admin/logs${qs ? "?" + qs : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileBarChart className="h-4 w-4" />
          AI 调用日志（显示 {logs.length}，过去 200 条）
        </h2>
        <p className="text-xs text-zinc-500">
          每次 PDF 提取 / 出题 / 批改 / 冲刺计划生成都会落一条记录
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">调用</div>
          <div className="text-2xl font-bold">{totals.count}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">失败</div>
          <div className="text-2xl font-bold text-red-700">{totals.errorCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">输入 tokens</div>
          <div className="text-2xl font-bold font-mono">
            {totals.prompt.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">输出 tokens</div>
          <div className="text-2xl font-bold font-mono">
            {totals.completion.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">估算成本</div>
          <div className="text-2xl font-bold text-amber-700">
            ¥{totals.cost.toFixed(2)}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
          <Filter className="h-3.5 w-3.5" />
          过滤
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={filterLink({ route: undefined })}
            className={`rounded-full border px-3 py-1 transition ${
              !filterRoute
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white hover:bg-zinc-50"
            }`}
          >
            全部 route
          </Link>
          {Object.entries(ROUTE_LABEL).map(([k, v]) => (
            <Link
              key={k}
              href={filterLink({ route: k })}
              className={`rounded-full border px-3 py-1 transition ${
                filterRoute === k
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white hover:bg-zinc-50"
              }`}
            >
              {v}
            </Link>
          ))}
          <span className="mx-2 my-auto text-zinc-300">|</span>
          <Link
            href={filterLink({ status: undefined })}
            className={`rounded-full border px-3 py-1 transition ${
              !filterStatus
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white hover:bg-zinc-50"
            }`}
          >
            全部 status
          </Link>
          {Object.keys(STATUS_STYLES).map((s) => (
            <Link
              key={s}
              href={filterLink({ status: s })}
              className={`rounded-full border px-3 py-1 transition ${
                filterStatus === s
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white hover:bg-zinc-50"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">时间</th>
              <th className="px-3 py-2 text-left font-medium">用户</th>
              <th className="px-3 py-2 text-left font-medium">Route</th>
              <th className="px-3 py-2 text-left font-medium">Model</th>
              <th className="px-3 py-2 text-left font-medium">状态</th>
              <th className="px-3 py-2 text-right font-medium">耗时</th>
              <th className="px-3 py-2 text-right font-medium">Tokens (in / out)</th>
              <th className="px-3 py-2 text-right font-medium">成本</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50/60">
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                  {fmtDate(l.created_at)}
                </td>
                <td className="px-3 py-2 font-mono">
                  {l.user_id
                    ? userEmailMap.get(l.user_id) ?? l.user_id.slice(0, 8) + "…"
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  {ROUTE_LABEL[l.route] ?? l.route}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-600">
                  {l.model}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLES[l.status] ?? ""
                    }`}
                  >
                    {l.status}
                  </span>
                  {l.error_message && (
                    <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-red-600" title={l.error_message}>
                      {l.error_message}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[10px] text-zinc-600">
                  {l.latency_ms != null ? `${l.latency_ms}ms` : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[10px] text-zinc-600">
                  {l.prompt_tokens ?? "—"} / {l.completion_tokens ?? "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-700">
                  {l.cost_cny != null
                    ? `¥${Number(l.cost_cny).toFixed(4)}`
                    : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-xs text-zinc-500"
                >
                  当前过滤条件下无记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

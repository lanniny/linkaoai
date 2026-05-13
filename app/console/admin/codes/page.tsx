import { TicketCheck } from "lucide-react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { GenerateCodesForm } from "./GenerateCodesForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  used: "bg-zinc-200 text-zinc-600",
  expired: "bg-amber-100 text-amber-800",
  revoked: "bg-red-100 text-red-700",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

export default async function AdminCodesPage() {
  const admin = createSupabaseAdminClient();

  const [codesRes, usersRes] = await Promise.all([
    admin
      .from("redemption_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const codes = codesRes.data ?? [];
  const userEmailMap = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const stats = {
    active: codes.filter((c) => c.status === "active").length,
    used: codes.filter((c) => c.status === "used").length,
    expired: codes.filter((c) => c.status === "expired").length,
    revoked: codes.filter((c) => c.status === "revoked").length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <TicketCheck className="h-4 w-4" />
          兑换码管理（{codes.length}）
        </h2>
        <p className="text-xs text-zinc-500">
          批量生成给小红书 / 群友 / 推广合作 · 每个码绑一个学科
        </p>
      </header>

      <section className="grid grid-cols-4 gap-3 text-center">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">可用</div>
          <div className="text-2xl font-bold text-emerald-700">
            {stats.active}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">已使用</div>
          <div className="text-2xl font-bold text-zinc-700">{stats.used}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">已过期</div>
          <div className="text-2xl font-bold text-amber-700">
            {stats.expired}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">作废</div>
          <div className="text-2xl font-bold text-red-700">{stats.revoked}</div>
        </div>
      </section>

      <GenerateCodesForm />

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">兑换码</th>
              <th className="px-3 py-2 text-left font-medium">学科</th>
              <th className="px-3 py-2 text-left font-medium">面值</th>
              <th className="px-3 py-2 text-left font-medium">状态</th>
              <th className="px-3 py-2 text-left font-medium">使用者</th>
              <th className="px-3 py-2 text-left font-medium">创建</th>
              <th className="px-3 py-2 text-left font-medium">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {codes.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50/60">
                <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                <td className="px-3 py-2">{c.subject}</td>
                <td className="px-3 py-2 font-mono">
                  ¥{Number(c.amount_cny).toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLES[c.status] ?? ""
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                  {c.used_by ? userEmailMap.get(c.used_by) ?? "—" : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-400">
                  {fmtDate(c.created_at)}
                </td>
                <td className="px-3 py-2 text-zinc-600">{c.notes ?? "—"}</td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-xs text-zinc-500"
                >
                  还没有兑换码 · 用上方表单生成
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

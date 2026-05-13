import { ShieldCheck } from "lucide-react";

import { getUserRole, isRootAdmin, roleLabel } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserRoleSelect } from "./UserRoleSelect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

export default async function AdminUsersPage() {
  const adminClient = createSupabaseAdminClient();

  // current viewer (to gate "change role" UI to root only)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerIsRoot = isRootAdmin(viewer);

  const [usersRes, paymentsRes] = await Promise.all([
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminClient
      .from("payments")
      .select("user_id, subject, status")
      .eq("status", "paid"),
  ]);

  const users = usersRes.data?.users ?? [];
  const payments = paymentsRes.data ?? [];

  // Build unlocked-subjects map
  const unlockedMap: Record<string, Set<string>> = {};
  for (const p of payments) {
    const k = p.user_id;
    if (!k) continue;
    if (!unlockedMap[k]) unlockedMap[k] = new Set();
    unlockedMap[k].add(p.subject);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />
            用户管理（{users.length}）
          </h2>
          <p className="text-xs text-zinc-500">
            按注册时间倒序 · 仅 root 可修改角色
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">邮箱</th>
              <th className="px-3 py-2 text-left font-medium">角色</th>
              <th className="px-3 py-2 text-left font-medium">已解锁</th>
              <th className="px-3 py-2 text-left font-medium">注册</th>
              <th className="px-3 py-2 text-left font-medium">上次登录</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {users
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )
              .map((u) => {
                const role = getUserRole(u);
                const unlocked = unlockedMap[u.id]
                  ? Array.from(unlockedMap[u.id]!)
                  : [];
                return (
                  <tr key={u.id} className="hover:bg-zinc-50/60">
                    <td className="px-3 py-2 font-mono">
                      <div className="truncate">{u.email}</div>
                      <div className="font-mono text-[10px] text-zinc-400">
                        {u.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {viewerIsRoot && u.id !== viewer?.id ? (
                        <UserRoleSelect userId={u.id} currentRole={role} />
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            role === 10
                              ? "bg-red-100 text-red-700"
                              : role === 1
                                ? "bg-amber-100 text-amber-700"
                                : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {roleLabel(role)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {unlocked.length === 0 ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {unlocked.map((s) => (
                            <span
                              key={s}
                              className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                      {fmtDate(u.last_sign_in_at)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

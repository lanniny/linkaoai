import { Calendar, LogOut, Mail, ShieldCheck, User2 } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

export default async function ConsoleSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // unlocked subjects from paid payments
  const { data: payments } = await supabase
    .from("payments")
    .select("subject, status, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: false });
  const unlocked = Array.from(new Set((payments ?? []).map((p) => p.subject)));

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      {/* Account card */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-bold text-white shadow-sm">
            {(user?.email?.[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {user?.email ?? "（未登录）"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              UID <span className="font-mono">{user?.id?.slice(0, 8)}…</span>
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-xs">
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <Mail className="h-3 w-3" />
              邮箱
            </dt>
            <dd className="font-mono text-zinc-700">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <ShieldCheck className="h-3 w-3" />
              邮箱已验证
            </dt>
            <dd className="text-zinc-700">
              {user?.email_confirmed_at ? "✓ 已验证" : "✗ 未验证"}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <User2 className="h-3 w-3" />
              注册渠道
            </dt>
            <dd className="text-zinc-700">
              {user?.app_metadata?.provider ?? "—"}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <Calendar className="h-3 w-3" />
              创建时间
            </dt>
            <dd className="font-mono text-zinc-700">
              {fmtDate(user?.created_at)}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <Calendar className="h-3 w-3" />
              上次登录
            </dt>
            <dd className="font-mono text-zinc-700">
              {fmtDate(user?.last_sign_in_at)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Unlocked subjects */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">🔓 已解锁学科</h2>
        {unlocked.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            还没有解锁任何学科 · 19.9 元 / 单科
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {unlocked.map((s) => (
              <span
                key={s}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
              >
                ✓ {s}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Security / actions */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">🔧 账户操作</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="font-medium">修改密码</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              暂未提供 · 主人可在 Supabase Dashboard → Auth → Users 重置
            </p>
          </li>
          <li className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="font-medium">导出全部数据</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              暂未提供 · 后续会支持 JSON 一键导出
            </p>
          </li>
          <li className="rounded-lg border border-red-100 bg-red-50/60 p-3">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                退出登录
              </button>
            </form>
          </li>
        </ul>
      </section>

      <p className="text-center text-[11px] text-zinc-400">
        临考 v0.1 · linkaoai.com · 30 天 MVP
      </p>
    </div>
  );
}

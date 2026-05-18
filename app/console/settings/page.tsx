import { and, desc, eq } from "drizzle-orm";
import { Calendar, LogOut, Mail, ShieldCheck, User2 } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db, payments, personalAccessTokens } from "@/lib/db";
import { PatManager } from "./PatManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(s: Date | string | null | undefined): string {
  if (!s) return "—";
  try {
    const d = s instanceof Date ? s : new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

export default async function ConsoleSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console/settings");
  const user = session.user;

  const [paidRows, tokenRows] = await Promise.all([
    db
      .select({ subject: payments.subject })
      .from(payments)
      .where(and(eq(payments.userId, user.id), eq(payments.status, "paid"))),
    db
      .select({
        id: personalAccessTokens.id,
        name: personalAccessTokens.name,
        prefix: personalAccessTokens.prefix,
        scopes: personalAccessTokens.scopes,
        createdAt: personalAccessTokens.createdAt,
        lastUsedAt: personalAccessTokens.lastUsedAt,
        revokedAt: personalAccessTokens.revokedAt,
        expiresAt: personalAccessTokens.expiresAt,
      })
      .from(personalAccessTokens)
      .where(eq(personalAccessTokens.userId, user.id))
      .orderBy(desc(personalAccessTokens.createdAt))
      .limit(50),
  ]);
  const unlocked = Array.from(new Set(paidRows.map((p) => p.subject)));
  // Serialize timestamps to numbers for client component prop boundary
  // (Date instances don't survive RSC → client serialization untouched).
  const tokens = tokenRows.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scopes: (t.scopes ?? []) as ("read" | "write")[],
    createdAt: t.createdAt ? new Date(t.createdAt).getTime() : 0,
    lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : null,
    revokedAt: t.revokedAt ? new Date(t.revokedAt).getTime() : null,
    expiresAt: t.expiresAt ? new Date(t.expiresAt).getTime() : null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-bold text-white shadow-sm">
            {(user.email?.[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {user.email ?? "（未登录）"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              UID <span className="font-mono">{user.id?.slice(0, 8)}…</span>
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-xs">
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <Mail className="h-3 w-3" />
              邮箱
            </dt>
            <dd className="font-mono text-zinc-700">{user.email ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <ShieldCheck className="h-3 w-3" />
              邮箱已验证
            </dt>
            <dd className="text-zinc-700">
              {user.emailVerified ? "✓ 已验证" : "✗ 未验证"}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <User2 className="h-3 w-3" />
              昵称
            </dt>
            <dd className="text-zinc-700">{user.name ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="inline-flex w-28 items-center gap-1.5 text-zinc-500">
              <Calendar className="h-3 w-3" />
              创建时间
            </dt>
            <dd className="font-mono text-zinc-700">
              {fmtDate(user.createdAt)}
            </dd>
          </div>
        </dl>
      </section>

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

      <PatManager initial={tokens} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">🔧 账户操作</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="font-medium">修改密码</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              暂未提供 UI · 后续接入 better-auth changePassword
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

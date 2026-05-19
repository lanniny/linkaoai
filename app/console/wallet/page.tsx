import { eq, sql } from "drizzle-orm";
import { ArrowDown, ArrowUp, Receipt, RotateCcw, Wallet } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db, walletTransactions } from "@/lib/db";
import { getBalance, listTransactions, monthlySpend } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function centsToCny(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

function fmtDateTime(s: Date | string | null): string {
  if (!s) return "—";
  try {
    const d = s instanceof Date ? s : new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

const TYPE_META: Record<
  string,
  { label: string; tone: string; Icon: typeof ArrowUp; sign: string }
> = {
  topup: {
    label: "充值",
    tone: "bg-blue-100 text-blue-800 border-blue-200",
    Icon: ArrowUp,
    sign: "+",
  },
  consume: {
    label: "扣费",
    tone: "bg-red-100 text-red-800 border-red-200",
    Icon: ArrowDown,
    sign: "-",
  },
  refund: {
    label: "退款",
    tone: "bg-purple-100 text-purple-800 border-purple-200",
    Icon: RotateCcw,
    sign: "+",
  },
};

export default async function WalletPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console/wallet");
  const userId = session.user.id;

  const [balanceCents, spendCents, txns, totalsRows] = await Promise.all([
    getBalance(userId),
    monthlySpend(userId),
    listTransactions(userId, 100),
    // 累计充值 + 累计扣费（绝对值），用于 stats card
    db
      .select({
        type: walletTransactions.type,
        total: sql<number>`sum(abs(${walletTransactions.amountCents}))`,
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .groupBy(walletTransactions.type),
  ]);

  const totals: Record<string, number> = {};
  for (const r of totalsRows) totals[r.type] = Number(r.total) || 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-1.5 text-base font-semibold">
            <Wallet className="h-4 w-4 text-blue-700" />
            钱包流水
          </h1>
          <p className="text-xs text-zinc-500">
            pay-as-you-go 流水明细 · 最近 100 条 · append-only 不可修改
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/console/billing"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            充值
          </Link>
          <Link
            href="/console/billing/history"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <Receipt className="mr-1 inline h-3 w-3 align-text-bottom" />
            订单
          </Link>
        </div>
      </header>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="text-[11px] text-blue-900/70">当前余额</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">
            ¥{centsToCny(balanceCents)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] text-zinc-500">本月消费</div>
          <div className="mt-1 text-2xl font-bold text-zinc-700">
            ¥{centsToCny(spendCents)}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="text-[11px] text-emerald-900/70">累计充值</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">
            ¥{centsToCny((totals.topup ?? 0) + (totals.refund ?? 0))}
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 shadow-sm">
          <div className="text-[11px] text-red-900/70">累计扣费</div>
          <div className="mt-1 text-2xl font-bold text-red-700">
            ¥{centsToCny(totals.consume ?? 0)}
          </div>
        </div>
      </section>

      {/* Transactions list */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">流水明细</h2>
        {txns.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            还没有任何流水。前往{" "}
            <Link
              href="/console/billing"
              className="text-blue-700 underline-offset-2 hover:underline"
            >
              充值
            </Link>{" "}
            后会出现第一条。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {txns.map((t) => {
              const meta = TYPE_META[t.type] ?? TYPE_META.consume;
              const Icon = meta.Icon;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded ${meta.tone.replace("border-", "")}`}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.tone}`}
                    >
                      {meta.label}
                    </span>
                    <span className="truncate text-zinc-600">
                      {t.description ?? "—"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-3">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        t.amountCents >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {meta.sign}¥
                      {centsToCny(Math.abs(t.amountCents))}
                    </span>
                    <span className="hidden font-mono text-[10px] text-zinc-400 sm:inline">
                      余 ¥{centsToCny(t.balanceAfterCents)}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {fmtDateTime(t.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-center text-[11px] text-zinc-400">
        💡 余额永不过期 · 配额耗尽后自动按 AI cost 扣费 · Pro 订阅不扣钱包
      </p>
    </div>
  );
}

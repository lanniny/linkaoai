import { desc, eq } from "drizzle-orm";
import { Calendar, Receipt } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db, payments } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-zinc-200 text-zinc-700",
  failed: "bg-red-100 text-red-700",
};

const CHANNEL_LABEL: Record<string, string> = {
  wechat_manual: "微信手动",
  alipay_manual: "支付宝手动",
  epay_alipay: "易支付·支付宝",
  epay_wxpay: "易支付·微信",
  redemption_code: "兑换码",
};

function fmtMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDate(s: Date | string | null): string {
  if (!s) return "—";
  try {
    const d = s instanceof Date ? s : new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

export default async function BillingHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/console/billing/history");
  const userId = session.user.id;

  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(300);

  // Group by month
  const grouped = new Map<
    string,
    {
      paidAmount: number;
      refundAmount: number;
      orders: typeof rows;
    }
  >();
  for (const r of rows) {
    if (!r.createdAt) continue;
    const month = fmtMonth(new Date(r.createdAt));
    if (!grouped.has(month)) {
      grouped.set(month, {
        paidAmount: 0,
        refundAmount: 0,
        orders: [],
      });
    }
    const bucket = grouped.get(month)!;
    if (r.status === "paid") bucket.paidAmount += Number(r.amountCny) || 0;
    if (r.status === "refunded") bucket.refundAmount += Number(r.amountCny) || 0;
    bucket.orders.push(r);
  }

  // Overall totals
  const totalPaid = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + (Number(r.amountCny) || 0), 0);
  const totalRefunded = rows
    .filter((r) => r.status === "refunded")
    .reduce((s, r) => s + (Number(r.amountCny) || 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Receipt className="h-4 w-4" />
            下单记录（{rows.length}）
          </h2>
          <p className="text-xs text-zinc-500">
            按月汇总 · 含 paid / pending / refunded 全状态
          </p>
        </div>
        <Link
          href="/console/billing"
          className="text-xs text-zinc-500 underline-offset-2 hover:underline"
        >
          ← 返回下单
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="text-xs text-emerald-900/70">累计已付</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">
            ¥{totalPaid.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm">
          <div className="text-xs text-zinc-500">累计退款</div>
          <div className="mt-1 text-2xl font-bold text-zinc-700">
            ¥{totalRefunded.toFixed(2)}
          </div>
        </div>
      </section>

      {rows.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <Receipt className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-600">还没下过单</p>
          <Link
            href="/console/billing"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            去下单
          </Link>
        </div>
      )}

      {Array.from(grouped.entries()).map(([month, bucket]) => (
        <section
          key={month}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-baseline justify-between border-b border-zinc-100 pb-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Calendar className="h-3.5 w-3.5" />
              {month}
            </h3>
            <div className="space-x-3 text-xs">
              <span className="text-emerald-700">
                付 ¥{bucket.paidAmount.toFixed(2)}
              </span>
              {bucket.refundAmount > 0 && (
                <span className="text-zinc-500">
                  退 ¥{bucket.refundAmount.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <ul className="divide-y divide-zinc-100">
            {bucket.orders.map((r) => (
              <li
                key={r.id}
                className="flex items-baseline justify-between gap-3 py-2 text-xs"
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      STATUS_STYLES[r.status] ?? ""
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="font-medium">{r.subject}</span>
                  <span className="font-mono text-zinc-500">
                    ¥{Number(r.amountCny).toFixed(2)}
                  </span>
                  <span className="text-zinc-400">
                    {CHANNEL_LABEL[r.channel] ?? r.channel}
                  </span>
                  {r.refundReason && (
                    <span
                      className="text-[10px] text-zinc-500"
                      title={r.refundReason}
                    >
                      · 退款原因 {r.refundReason.slice(0, 20)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                  {fmtDate(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import { desc, inArray } from "drizzle-orm";
import { Receipt } from "lucide-react";

import { db, payments, user } from "@/lib/db";
import { OrderMarkPaidButton } from "./OrderMarkPaidButton";
import { OrderRefundButton } from "./OrderRefundButton";
import { WalletReconcileBanner } from "./WalletReconcileBanner";

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

function fmtDate(s: Date | string | null): string {
  if (!s) return "—";
  try {
    const d = s instanceof Date ? s : new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

export default async function AdminOrdersPage() {
  const paymentRows = await db
    .select()
    .from(payments)
    .orderBy(desc(payments.createdAt))
    .limit(200);

  const userIds = Array.from(
    new Set(paymentRows.map((p) => p.userId).filter(Boolean)),
  );
  const users =
    userIds.length > 0
      ? await db
          .select({ id: user.id, email: user.email })
          .from(user)
          .where(inArray(user.id, userIds))
      : [];
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  const totals = paymentRows.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      if (p.status === "paid") {
        acc.revenue += Number(p.amountCny) || 0;
      }
      return acc;
    },
    { pending: 0, paid: 0, refunded: 0, failed: 0, revenue: 0 } as Record<
      string,
      number
    >,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Receipt className="h-4 w-4" />
          订单管理（{paymentRows.length}）
        </h2>
        <p className="text-xs text-zinc-500">
          手动渠道（微信/支付宝）需 admin 手工标记为 paid 才解锁
        </p>
      </header>

      {/* 钱包对账 banner — 列出 paid wallet 订单中没对应 topup 流水的孤儿 */}
      <WalletReconcileBanner />

      <section className="grid grid-cols-4 gap-3 text-center">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">待处理</div>
          <div className="text-2xl font-bold text-amber-700">
            {totals.pending}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">已付</div>
          <div className="text-2xl font-bold text-emerald-700">
            {totals.paid}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">已退款</div>
          <div className="text-2xl font-bold text-zinc-600">
            {totals.refunded}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-zinc-500">总收入</div>
          <div className="text-2xl font-bold text-emerald-700">
            ¥{Number(totals.revenue).toFixed(2)}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">订单</th>
              <th className="px-3 py-2 text-left font-medium">用户</th>
              <th className="px-3 py-2 text-left font-medium">学科</th>
              <th className="px-3 py-2 text-left font-medium">金额</th>
              <th className="px-3 py-2 text-left font-medium">渠道</th>
              <th className="px-3 py-2 text-left font-medium">状态</th>
              <th className="px-3 py-2 text-left font-medium">创建</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {paymentRows.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50/60">
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                  {p.id.slice(0, 8)}…
                </td>
                <td className="px-3 py-2 font-mono">
                  {p.userId
                    ? emailMap.get(p.userId) ?? p.userId.slice(0, 8) + "…"
                    : "—"}
                </td>
                <td className="px-3 py-2">{p.subject}</td>
                <td className="px-3 py-2 font-mono">
                  ¥{Number(p.amountCny).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {CHANNEL_LABEL[p.channel] ?? p.channel}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLES[p.status] ?? ""
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-400">
                  {fmtDate(p.createdAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  {p.status === "pending" && (
                    <OrderMarkPaidButton paymentId={p.id} />
                  )}
                  {p.status === "paid" && (
                    <OrderRefundButton paymentId={p.id} />
                  )}
                  {p.status === "refunded" && p.refundReason && (
                    <span
                      className="font-mono text-[10px] text-zinc-500"
                      title={p.refundReason}
                    >
                      已退款
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {paymentRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-xs text-zinc-500"
                >
                  暂无订单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

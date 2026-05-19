"use client";

import { Receipt, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  balanceCents: number;
  monthlySpendCents: number;
}

function centsToCny(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

const PRESETS = [10, 30, 50, 100] as const;

type PayChannel = "alipay" | "wxpay";
const INTENT_CHANNEL: Record<PayChannel, "epay_alipay" | "epay_wxpay"> = {
  alipay: "epay_alipay",
  wxpay: "epay_wxpay",
};

export function WalletTopup({ balanceCents, monthlySpendCents }: Props) {
  const [amount, setAmount] = useState<number>(30);
  const [pending, setPending] = useState(false);
  // Custom amount when "其他" tab is selected
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  // 支付渠道
  const [payChannel, setPayChannel] = useState<PayChannel>("alipay");

  async function handleTopup() {
    const finalAmount = useCustom ? Number(customAmount) : amount;
    if (!Number.isFinite(finalAmount) || finalAmount < 1 || finalAmount > 1000) {
      toast.error("充值金额必须在 ¥1 ~ ¥1000 之间");
      return;
    }
    setPending(true);
    try {
      const intentRes = await fetch("/api/payment/intent", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          purchase_type: "wallet_topup",
          channel: INTENT_CHANNEL[payChannel],
          amount_cny: finalAmount,
        }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) {
        throw new Error(intentData.error ?? `HTTP ${intentRes.status}`);
      }

      const epayRes = await fetch("/api/payment/epay/create", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          order_id: intentData.order.id,
          type: payChannel,
        }),
      });
      const epayData = await epayRes.json();
      if (!epayRes.ok) {
        toast.error("自动充值通道暂不可用", {
          description: epayData.error ?? "请联系客服手动充值",
        });
        return;
      }
      toast(`跳转${payChannel === "alipay" ? "支付宝" : "微信"}充值…`);
      window.location.assign(epayData.payment_url as string);
    } catch (err) {
      toast.error("充值失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-blue-900">
          <Wallet className="h-4 w-4" />
          钱包余额 · 按量付费
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/console/wallet"
            className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white px-2 py-0.5 text-[10px] font-medium text-blue-700 transition hover:bg-blue-100"
          >
            <Receipt className="h-2.5 w-2.5" />
            流水
          </Link>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
            pay-as-you-go
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white p-3">
          <div className="text-[10px] text-zinc-500">当前余额</div>
          <div className="mt-0.5 text-2xl font-bold text-blue-700">
            ¥{centsToCny(balanceCents)}
          </div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-[10px] text-zinc-500">本月已消费</div>
          <div className="mt-0.5 text-2xl font-bold text-zinc-700">
            ¥{centsToCny(monthlySpendCents)}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-blue-900">
        💡 配额耗尽（Free / Plus 用户）后自动用钱包余额按 AI 实际 token 成本扣费 ·
        Pro 用户 unlimited 不扣钱包 · 余额永不过期
      </p>

      {/* 支付渠道选择 */}
      <div>
        <div className="text-[11px] font-medium text-zinc-700">支付方式</div>
        <div className="mt-1.5 inline-flex rounded-lg border border-zinc-300 bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setPayChannel("alipay")}
            disabled={pending}
            className={`rounded px-3 py-1 font-medium transition disabled:opacity-50 ${
              payChannel === "alipay"
                ? "bg-blue-600 text-white"
                : "text-zinc-600 hover:bg-blue-50"
            }`}
          >
            💙 支付宝
          </button>
          <button
            type="button"
            onClick={() => setPayChannel("wxpay")}
            disabled={pending}
            className={`rounded px-3 py-1 font-medium transition disabled:opacity-50 ${
              payChannel === "wxpay"
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 hover:bg-emerald-50"
            }`}
          >
            💚 微信
          </button>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-medium text-zinc-700">充值金额</div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAmount(p);
                setUseCustom(false);
              }}
              disabled={pending}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                !useCustom && amount === p
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              ¥{p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseCustom(true)}
            disabled={pending}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              useCustom
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            其他
          </button>
          {useCustom && (
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={pending}
              placeholder="1-1000"
              className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs"
            />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleTopup}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap className="h-4 w-4" />
        {pending
          ? "跳转支付…"
          : `充值 ¥${useCustom ? customAmount || "?" : amount}`}
      </button>
    </section>
  );
}

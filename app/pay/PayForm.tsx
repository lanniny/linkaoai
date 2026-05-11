"use client";

import { useState } from "react";
import type { PaymentChannel, Subject } from "@/lib/types";

const SUBJECTS: Subject[] = ["高数", "线代", "概率论", "其他"];

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  wechat_manual: "微信（手动转账，备注开通）",
  alipay_manual: "支付宝（手动转账，备注开通）",
  epay: "易支付（自动渠道，待接入）",
  hupijiao: "虎皮椒（自动渠道，待接入）",
};

interface Order {
  id: string;
  subject: string;
  amount_cny: number;
  channel: string;
  status: string;
  created_at: string;
}

export default function PayForm({ signedIn }: { signedIn: boolean }) {
  const [subject, setSubject] = useState<Subject>("高数");
  const [channel, setChannel] = useState<PaymentChannel>("wechat_manual");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      setError("请先点击右上角「登录 / 注册」完成登录");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/intent", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          subject,
          channel,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setOrder(data.order as Order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  if (order) {
    return (
      <div className="space-y-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">✓ 订单已创建（待付款）</span>
          <span className="text-xs text-zinc-500">
            {new Date(order.created_at).toLocaleString()}
          </span>
        </div>
        <ul className="space-y-1 text-zinc-700">
          <li>
            <strong>订单号</strong>：
            <code className="ml-1 rounded bg-white px-2 py-0.5 font-mono text-xs">
              {order.id}
            </code>
          </li>
          <li>
            <strong>学科</strong>：{order.subject}
          </li>
          <li>
            <strong>金额</strong>：{Number(order.amount_cny).toFixed(2)} 元
          </li>
          <li>
            <strong>渠道</strong>：
            {CHANNEL_LABELS[order.channel as PaymentChannel] ?? order.channel}
          </li>
        </ul>
        <div className="rounded bg-white p-3 text-xs text-zinc-700">
          <strong>下一步</strong>：联系微信
          <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono">
            your-wechat-id
          </code>
          ，发送订单号
          <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono">
            {order.id.slice(0, 8)}…
          </code>
          + 转账截图。 我们 24 小时内开通账户。
        </div>
        <button
          type="button"
          onClick={() => setOrder(null)}
          className="text-xs text-zinc-500 underline"
        >
          再下一单
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!signedIn && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          ⚠️ 下单前请先 <a href="/login?next=/pay" className="underline">登录</a>
          （邮箱一键链接，无需密码）。
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            学科
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
            disabled={loading}
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            付款渠道
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as PaymentChannel)}
            disabled={loading}
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            {(Object.keys(CHANNEL_LABELS) as PaymentChannel[]).map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600">
          备注（可选 · 例：联系手机 / 学号）
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={200}
          disabled={loading}
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          placeholder=""
        />
      </div>
      <button
        type="submit"
        disabled={loading || !signedIn}
        className="w-full rounded bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "提交中…"
          : signedIn
            ? "下单（19.9 元 / 单科）"
            : "请先登录后下单"}
      </button>
      {error && <p className="text-sm text-red-600">⚠️ {error}</p>}
    </form>
  );
}

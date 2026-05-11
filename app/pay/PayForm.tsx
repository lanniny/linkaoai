"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PaymentChannel, Subject } from "@/lib/types";

const SUBJECTS: Subject[] = ["高数", "线代", "概率论", "其他"];

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  epay_alipay: "支付宝（自动跳转 EPay）",
  epay_wxpay: "微信（自动跳转 EPay）",
  wechat_manual: "微信（手动转账 · 24h 内开通）",
  alipay_manual: "支付宝（手动转账 · 24h 内开通）",
  redemption_code: "兑换码（已有码可直接兑换）",
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
  const [channel, setChannel] = useState<PaymentChannel>("epay_alipay");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  // Pick up ?return=success|failed|... from EPay return_url for inline banner
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const ret = p.get("return");
    if (!ret) return;
    if (ret === "success") {
      toast.success("支付成功！账户已开通", {
        description: `订单 ${p.get("order") ?? ""} 已标记 paid`,
      });
    } else if (ret === "failed") {
      toast.error("支付失败", { description: "请重新下单或联系客服" });
    } else if (ret === "sign_error") {
      toast.error("支付回调签名校验失败", {
        description: "请联系客服核对订单状态",
      });
    } else if (ret === "disabled") {
      toast.error("EPay 暂未启用", {
        description: "请改用手动渠道或兑换码",
      });
    }
    // strip the query to keep URL clean
    const url = new URL(window.location.href);
    url.searchParams.delete("return");
    url.searchParams.delete("order");
    window.history.replaceState({}, "", url.toString());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      const msg = "请先点击右上角「登录」完成登录";
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Step 1: create pending order
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
      const createdOrder = data.order as Order;

      // Step 2: if EPay channel, immediately exchange for a redirect URL
      if (channel === "epay_alipay" || channel === "epay_wxpay") {
        const epayRes = await fetch("/api/payment/epay/create", {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            order_id: createdOrder.id,
            type: channel === "epay_alipay" ? "alipay" : "wxpay",
          }),
        });
        const epayData = await epayRes.json();
        if (!epayRes.ok) {
          // Surface the order anyway so user can fall back to manual
          setOrder(createdOrder);
          throw new Error(
            (epayData.error ?? `HTTP ${epayRes.status}`) +
              "（已自动转手动模式，可发送订单号给客服）",
          );
        }
        toast("跳转到支付页…", {
          description: "支付完成会自动回到 /pay",
        });
        window.location.href = epayData.payment_url as string;
        return;
      }

      setOrder(createdOrder);
      toast.success("订单已创建", {
        description: `订单号 ${createdOrder.id.slice(0, 8)}…`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setError(msg);
      toast.error("下单失败", { description: msg });
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
          : !signedIn
            ? "请先登录后下单"
            : channel === "epay_alipay" || channel === "epay_wxpay"
              ? "下单并跳转支付（19.9 元）"
              : channel === "redemption_code"
                ? "下方输入兑换码 →"
                : "下单（19.9 元 / 单科）"}
      </button>
      {error && <p className="text-sm text-red-600">⚠️ {error}</p>}
      {channel === "redemption_code" && <RedemptionForm signedIn={signedIn} />}
    </form>
  );
}

function RedemptionForm({ signedIn }: { signedIn: boolean }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    subject: string;
    amount_cny: number;
  } | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      toast.error("请先登录后再兑换");
      return;
    }
    if (!code.trim()) {
      toast.error("请输入兑换码");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/redemption/redeem", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("兑换失败", { description: data.error ?? `HTTP ${res.status}` });
        return;
      }
      setSuccess({ subject: data.subject, amount_cny: data.amount_cny });
      toast.success("兑换成功！", {
        description: `${data.subject} 已解锁，价值 ${Number(data.amount_cny).toFixed(2)} 元`,
      });
      setCode("");
    } catch (err) {
      toast.error("兑换失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        ✓ 兑换成功 · {success.subject} 已解锁（{Number(success.amount_cny).toFixed(2)} 元）
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="ml-2 text-xs underline"
        >
          再兑一张
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3">
      <label className="block text-xs font-medium text-zinc-600">
        兑换码（不区分大小写）
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={loading || !signedIn}
          maxLength={64}
          autoCapitalize="characters"
          autoCorrect="off"
          className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm uppercase"
          placeholder="例: LINKAO-XXXX"
        />
        <button
          type="button"
          onClick={handleRedeem}
          disabled={loading || !signedIn || !code.trim()}
          className="rounded bg-emerald-700 px-4 py-1 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "校验中…" : "兑换"}
        </button>
      </div>
    </div>
  );
}

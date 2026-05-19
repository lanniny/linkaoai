"use client";

import { Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type RefundCalc = {
  eligible: boolean;
  suggested: number;
  breakdown: string;
  reason?: string;
};

export function OrderRefundButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [calc, setCalc] = useState<RefundCalc | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const router = useRouter();

  async function openModal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`);
      const data = await res.json();
      if (!res.ok) {
        toast.error("无法加载退款建议", {
          description: data.message ?? data.error,
        });
        return;
      }
      const c = data.calc as RefundCalc;
      setCalc(c);
      setAmount(c.suggested.toFixed(2));
      setReason("");
      setOpen(true);
    } catch (err) {
      toast.error("加载失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitRefund() {
    if (!reason.trim()) {
      toast.error("退款必须填原因");
      return;
    }
    const refundAmount = Number(amount);
    if (Number.isNaN(refundAmount) || refundAmount < 0) {
      toast.error("退款金额格式错误");
      return;
    }
    if (
      !confirm(
        `确认退款 ¥${refundAmount.toFixed(2)}？\n${calc?.breakdown ?? ""}\n\n理由：${reason}\n\n此操作不可撤销（订阅会同步 cancel）`,
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          refundAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      toast.success(`已退款 ¥${refundAmount.toFixed(2)}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error("退款失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  if (open && calc) {
    return (
      <div className="inline-flex w-full max-w-md flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] shadow-sm">
        <div
          className={`rounded px-2 py-1.5 ${
            calc.eligible
              ? "bg-emerald-100 text-emerald-900"
              : "bg-red-100 text-red-900"
          }`}
        >
          <div className="font-semibold">
            {calc.eligible ? "✓ 符合退款条件" : "⚠️ 条款不支持自动退款"}
          </div>
          <div className="mt-0.5">{calc.breakdown}</div>
          {calc.reason && (
            <div className="mt-0.5 text-[10px] opacity-80">
              {calc.reason} · admin 仍可强制退款，但请填明确原因
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-zinc-600">
              退款金额（¥）
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs"
            />
          </div>
          <div className="flex items-end text-[10px] text-zinc-500">
            建议：¥{calc.suggested.toFixed(2)}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-zinc-600">
            退款原因（必填，会留痕 refund_reason）
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            placeholder="例：用户挂科申请 · 学号 2024xxx"
            maxLength={120}
            className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submitRefund}
            disabled={loading || !reason.trim()}
            className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            确认退款
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openModal}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Undo2 className="h-3 w-3" />
      )}
      退款
    </button>
  );
}

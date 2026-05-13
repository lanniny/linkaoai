"use client";

import { Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function OrderRefundButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    const reason = prompt("填写退款原因（必填，会留痕到 refund_reason）");
    if (!reason || reason.trim().length === 0) {
      toast.error("退款必须填原因");
      return;
    }
    if (!confirm(`确认退款？理由：${reason}\n此操作不可撤销`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      toast.success("已退款");
      router.refresh();
    } catch (err) {
      toast.error("退款失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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

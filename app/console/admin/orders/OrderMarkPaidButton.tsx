"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function OrderMarkPaidButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm("确认这笔订单已收款？标记后用户立刻解锁学科")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/mark-paid`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      toast.success("已标记为 paid");
      router.refresh();
    } catch (err) {
      toast.error("操作失败", {
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
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Check className="h-3 w-3" />
      )}
      标记为 paid
    </button>
  );
}

"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Orphan = {
  paymentId: string;
  userId: string;
  amountCny: number;
  paidAt: string | null;
  createdAt: string | null;
};

export function WalletReconcileBanner() {
  const [orphans, setOrphans] = useState<Orphan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void fetch("/api/admin/wallet/reconcile")
      .then((r) => r.json())
      .then((d) => setOrphans(d.orphans ?? []))
      .catch(() => setOrphans([]));
  }, []);

  async function reconcileOne(paymentId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/wallet/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("补单失败", { description: data.message ?? data.error });
        return;
      }
      toast.success("补单成功", {
        description: `余额已加 · 当前 ¥${(data.balanceAfterCents / 100).toFixed(2)}`,
      });
      setOrphans((prev) =>
        (prev ?? []).filter((o) => o.paymentId !== paymentId),
      );
      router.refresh();
    } catch (err) {
      toast.error("补单失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setBusy(false);
    }
  }

  async function reconcileAll() {
    if (!orphans || orphans.length === 0) return;
    if (!confirm(`确认补 ${orphans.length} 笔订单？`)) return;
    setBusy(true);
    let success = 0;
    let failed = 0;
    for (const o of orphans) {
      try {
        const res = await fetch("/api/admin/wallet/reconcile", {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify({ paymentId: o.paymentId }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    toast.success(`补单完成 · ${success} 成功 / ${failed} 失败`);
    // 重新拉一次列表
    const res = await fetch("/api/admin/wallet/reconcile");
    const data = await res.json();
    setOrphans(data.orphans ?? []);
    setBusy(false);
    router.refresh();
  }

  if (orphans === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        正在对账钱包订单…
      </div>
    );
  }

  if (orphans.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        钱包对账平 · 所有 paid wallet 订单都有对应 topup 流水
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <AlertCircle className="h-3.5 w-3.5 text-red-700" />
          <span className="font-semibold text-red-900">
            {orphans.length} 笔钱包订单待补单
          </span>
          <span className="text-red-700">
            （已 paid 但没对应 topup 流水 — 可能 EPay notify 时 wallet.topup 失败）
          </span>
        </div>
        <button
          type="button"
          onClick={reconcileAll}
          disabled={busy}
          className="rounded-lg bg-red-700 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-red-800 disabled:opacity-50"
        >
          {busy ? "处理中…" : `一键补全 (${orphans.length})`}
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-[11px]">
        {orphans.slice(0, 5).map((o) => (
          <li
            key={o.paymentId}
            className="flex items-center justify-between gap-3 rounded bg-white px-2 py-1"
          >
            <span className="flex items-center gap-2">
              <code className="font-mono text-[10px] text-zinc-500">
                {o.paymentId.slice(0, 8)}…
              </code>
              <span className="font-mono">¥{o.amountCny.toFixed(2)}</span>
              <span className="text-zinc-500">
                user {o.userId.slice(0, 8)}…
              </span>
            </span>
            <button
              type="button"
              onClick={() => reconcileOne(o.paymentId)}
              disabled={busy}
              className="rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              补单
            </button>
          </li>
        ))}
        {orphans.length > 5 && (
          <li className="text-[10px] text-red-600">
            ⋯ 还有 {orphans.length - 5} 笔，点「一键补全」一次性处理
          </li>
        )}
      </ul>
    </div>
  );
}

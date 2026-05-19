"use client";

import { Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  userId: string;
  initialBalanceCents: number;
}

function centsToCny(c: number): string {
  return (Math.round(c) / 100).toFixed(2);
}

export function UserWalletCell({ userId, initialBalanceCents }: Props) {
  const [balanceCents, setBalanceCents] = useState(initialBalanceCents);
  const [open, setOpen] = useState(false);
  const [amountYuan, setAmountYuan] = useState<string>("10");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdjust() {
    const yuan = Number(amountYuan);
    if (!Number.isFinite(yuan) || yuan === 0) {
      toast.error("金额必须 ≠ 0");
      return;
    }
    if (yuan < -1000 || yuan > 1000) {
      toast.error("单次调整范围 [-1000, 1000] 元");
      return;
    }
    if (!reason.trim()) {
      toast.error("必须填原因");
      return;
    }
    const amountCents = Math.round(yuan * 100);
    const verb = amountCents > 0 ? "充值" : "扣减";
    if (
      !confirm(
        `确认${verb} ¥${Math.abs(yuan).toFixed(2)} ?\n理由：${reason.trim()}`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/wallet`, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ amountCents, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("调整失败", { description: data.message ?? data.error });
        return;
      }
      toast.success(
        `${verb} ¥${Math.abs(yuan).toFixed(2)} 成功 · 余额 ¥${centsToCny(data.balanceAfterCents)}`,
      );
      setBalanceCents(data.balanceAfterCents);
      setOpen(false);
      setReason("");
    } catch (err) {
      toast.error("调整失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setBusy(false);
    }
  }

  if (open) {
    return (
      <div className="flex flex-wrap items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2 py-1.5 text-[10px]">
        <Wallet className="h-2.5 w-2.5 text-blue-700" />
        <span className="font-mono">¥{centsToCny(balanceCents)}</span>
        <input
          type="number"
          step="0.01"
          value={amountYuan}
          onChange={(e) => setAmountYuan(e.target.value)}
          disabled={busy}
          placeholder="±¥"
          className="w-14 rounded border border-zinc-300 bg-white px-1 py-0.5 font-mono"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          placeholder="原因"
          maxLength={60}
          className="w-24 rounded border border-zinc-300 bg-white px-1 py-0.5"
        />
        <button
          type="button"
          onClick={handleAdjust}
          disabled={busy}
          className="rounded bg-blue-700 px-1.5 py-0.5 text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {busy ? "…" : "确认"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Wallet className="h-3 w-3 text-blue-700" />
      <span className="font-mono text-[11px] text-zinc-700">
        ¥{centsToCny(balanceCents)}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="手工调整钱包余额（正数充值 / 负数扣减）"
        className="inline-flex items-center gap-0.5 rounded border border-blue-300 bg-white px-1 py-0.5 text-[10px] text-blue-700 transition hover:bg-blue-50"
      >
        <Plus className="h-2.5 w-2.5" />
        调
      </button>
    </div>
  );
}

"use client";

import { Crown, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { EffectivePlan } from "@/lib/subscription";

export type UserSubscriptionInfo = {
  effectivePlan: EffectivePlan;
  /** 客户端可见的 active 订阅行（最多 plus + pro 各一条）。 */
  activeRows: Array<{
    id: string;
    plan: "plus" | "pro";
    currentPeriodEnd: number; // ms-since-epoch
  }>;
};

interface Props {
  userId: string;
  initial: UserSubscriptionInfo;
}

const PLAN_STYLES: Record<
  EffectivePlan,
  { label: string; tone: string; Icon: typeof Sparkles }
> = {
  free: {
    label: "Free",
    tone: "border-zinc-200 bg-zinc-100 text-zinc-700",
    Icon: Sparkles,
  },
  plus: {
    label: "Plus",
    tone: "border-amber-300 bg-amber-100 text-amber-800",
    Icon: Zap,
  },
  pro: {
    label: "Pro",
    tone: "border-emerald-300 bg-emerald-100 text-emerald-800",
    Icon: Crown,
  },
  legacy_lifetime: {
    label: "永久",
    tone: "border-purple-300 bg-purple-100 text-purple-800",
    Icon: Crown,
  },
};

function daysLeft(ms: number, now: number): number {
  return Math.max(0, Math.ceil((ms - now) / 86400_000));
}

export function UserSubscriptionCell({ userId, initial }: Props) {
  const [info, setInfo] = useState<UserSubscriptionInfo>(initial);
  const [showGrant, setShowGrant] = useState(false);
  const [grantPlan, setGrantPlan] = useState<"plus" | "pro">("pro");
  const [grantDays, setGrantDays] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  // Snapshot now once when the component renders — avoids React 19's
  // react-hooks/purity warning on Date.now() and keeps "距过期 X 天" stable
  // across re-renders of the same row.
  const [renderNowMs] = useState(() => Date.now());

  const style = PLAN_STYLES[info.effectivePlan];

  async function handleGrant() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ plan: grantPlan, periodDays: grantDays }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("授予失败", { description: data.message ?? data.error });
        return;
      }
      toast.success(`已授予 ${grantPlan === "pro" ? "Pro" : "Plus"} ${grantDays} 天`);
      // 把返回的新订阅插入本地 state，UI 立即反映
      const sub = data.subscription as {
        id: string;
        plan: "plus" | "pro";
        currentPeriodEnd: string | number;
      };
      setInfo((prev) => ({
        // 假设授予 Pro 后 effective plan 升级；准确算法跟服务端 getUserPlan 保持一致
        effectivePlan:
          prev.effectivePlan === "legacy_lifetime"
            ? "legacy_lifetime"
            : sub.plan === "pro"
              ? "pro"
              : prev.effectivePlan === "pro"
                ? "pro"
                : "plus",
        activeRows: [
          ...prev.activeRows.filter((r) => r.plan !== sub.plan),
          {
            id: sub.id,
            plan: sub.plan,
            currentPeriodEnd:
              typeof sub.currentPeriodEnd === "number"
                ? sub.currentPeriodEnd
                : new Date(sub.currentPeriodEnd).getTime(),
          },
        ],
      }));
      setShowGrant(false);
    } catch (err) {
      toast.error("授予失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(subId: string, planLabel: string) {
    if (!confirm(`确认撤销该用户的 ${planLabel} 订阅？这会立即把订阅标记为 cancelled。`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/subscription/${subId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("撤销失败", { description: data.message ?? data.error });
        return;
      }
      toast.success(`已撤销 ${planLabel} 订阅`);
      setInfo((prev) => {
        const remaining = prev.activeRows.filter((r) => r.id !== subId);
        // 重新算 effective plan：legacy 保留 / 否则 pro > plus > free
        const nextPlan: EffectivePlan =
          prev.effectivePlan === "legacy_lifetime"
            ? "legacy_lifetime"
            : remaining.some((r) => r.plan === "pro")
              ? "pro"
              : remaining.some((r) => r.plan === "plus")
                ? "plus"
                : "free";
        return { effectivePlan: nextPlan, activeRows: remaining };
      });
    } catch (err) {
      toast.error("撤销失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setBusy(false);
    }
  }

  const Icon = style.Icon;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${style.tone}`}
        >
          <Icon className="h-2.5 w-2.5" />
          {style.label}
        </span>
        {/* 显示每条 active 订阅的剩余天数 + 撤销按钮 */}
        {info.activeRows.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-1 text-[10px] text-zinc-500"
          >
            {r.plan} {daysLeft(r.currentPeriodEnd, renderNowMs)}d
            <button
              type="button"
              onClick={() => handleRevoke(r.id, r.plan === "pro" ? "Pro" : "Plus")}
              disabled={busy}
              title="撤销此订阅"
              className="text-red-500 transition hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {!showGrant && (
          <button
            type="button"
            onClick={() => setShowGrant(true)}
            disabled={busy}
            title="手工授予订阅（不经过 payments）"
            className="ml-auto inline-flex items-center gap-0.5 rounded border border-zinc-300 bg-white px-1 py-0.5 text-[10px] text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <Plus className="h-2.5 w-2.5" />
            授予
          </button>
        )}
      </div>
      {showGrant && (
        <div className="flex flex-wrap items-center gap-1 rounded border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-[10px]">
          <select
            value={grantPlan}
            onChange={(e) => setGrantPlan(e.target.value as "plus" | "pro")}
            disabled={busy}
            className="rounded border border-zinc-300 bg-white px-1 py-0.5"
          >
            <option value="plus">Plus</option>
            <option value="pro">Pro</option>
          </select>
          <select
            value={grantDays}
            onChange={(e) => setGrantDays(Number(e.target.value))}
            disabled={busy}
            className="rounded border border-zinc-300 bg-white px-1 py-0.5"
          >
            <option value="7">7d</option>
            <option value="30">30d</option>
            <option value="90">90d</option>
            <option value="365">365d</option>
          </select>
          <button
            type="button"
            onClick={handleGrant}
            disabled={busy}
            className="rounded bg-zinc-900 px-1.5 py-0.5 text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? "…" : "确认"}
          </button>
          <button
            type="button"
            onClick={() => setShowGrant(false)}
            disabled={busy}
            className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}

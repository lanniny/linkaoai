"use client";

import { Check, Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { EffectivePlan } from "@/lib/subscription";

type ActiveSubscription = {
  id: string;
  plan: "plus" | "pro";
  currentPeriodEnd: number; // ms since epoch (serialized from server)
};

interface Props {
  currentPlan: EffectivePlan;
  activeSubs: ActiveSubscription[];
}

/** Pro 的月付/年付选择 — Plus 入门档不引导年付（学生现金流敏感）。 */
type ProCycle = "monthly" | "yearly";

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysLeft(ms: number): number {
  return Math.max(0, Math.ceil((ms - Date.now()) / 86400_000));
}

const PLAN_META = {
  free: {
    name: "Free",
    price: "¥0",
    cadence: "/月",
    icon: Sparkles,
    color: "zinc",
    features: [
      "PDF 提取 1 次/月",
      "AI 出题 20 次/月",
      "批改 60 次/月",
      "冲刺计划 3 次/月",
    ],
  },
  plus: {
    name: "Plus",
    price: "¥9.9",
    cadence: "/月",
    icon: Zap,
    color: "amber",
    features: [
      "PDF 提取 5 次/月",
      "AI 出题 100 次/月",
      "批改 300 次/月",
      "冲刺计划 10 次/月",
      "三学科全开（高数/线代/概率论）",
    ],
  },
  pro: {
    name: "Pro",
    price: "¥19.9",
    cadence: "/月",
    icon: Crown,
    color: "emerald",
    features: [
      "全部 AI 调用不限次",
      "模拟卷优先使用 Opus 模型",
      "90 天历史记录保留",
      "所有学科解锁",
      "挂科退款政策（仅年付）",
    ],
  },
} as const;

/** Pro 年付价格 — 跟 lib/subscription.ts PLAN_YEARLY_PRICE_CNY.pro 保持一致。 */
const PRO_YEARLY_PRICE = "¥199";
const PRO_YEARLY_SAVE_PCT = 17; // 199 / (19.9 * 12) ≈ 0.834 → 节省约 17%

const TONES = {
  zinc: {
    card: "border-zinc-200 bg-white",
    pillBg: "bg-zinc-100",
    pillText: "text-zinc-700",
    iconBg: "bg-zinc-100 text-zinc-700",
    btn: "bg-zinc-300 text-zinc-500 cursor-not-allowed",
    activeRing: "ring-zinc-400",
  },
  amber: {
    card: "border-amber-200 bg-amber-50/50",
    pillBg: "bg-amber-100",
    pillText: "text-amber-800",
    iconBg: "bg-amber-100 text-amber-700",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
    activeRing: "ring-amber-400",
  },
  emerald: {
    card: "border-emerald-200 bg-emerald-50/40",
    pillBg: "bg-emerald-100",
    pillText: "text-emerald-800",
    iconBg: "bg-emerald-100 text-emerald-700",
    btn: "bg-emerald-700 hover:bg-emerald-800 text-white",
    activeRing: "ring-emerald-500",
  },
} as const;

export function SubscriptionPlans({ currentPlan, activeSubs }: Props) {
  const [pendingPlan, setPendingPlan] = useState<"plus" | "pro" | null>(null);
  // Pro 月/年切换 — 默认年付（先呈现节省 17% 的价格锚点）
  const [proCycle, setProCycle] = useState<ProCycle>("yearly");

  // 找当前 active 同 plan 行的 period_end，用于显示"距过期 N 天"
  const subByPlan: Record<"plus" | "pro", ActiveSubscription | undefined> = {
    plus: activeSubs.find((s) => s.plan === "plus"),
    pro: activeSubs.find((s) => s.plan === "pro"),
  };

  async function handleSubscribe(plan: "plus" | "pro") {
    setPendingPlan(plan);
    try {
      // Plus 只支持月付；Pro 按 proCycle 决定月/年
      const purchaseType =
        plan === "plus"
          ? "plus_monthly"
          : proCycle === "yearly"
            ? "pro_yearly"
            : "pro_monthly";
      // 1. 创建 pending payment row
      const intentRes = await fetch("/api/payment/intent", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          purchase_type: purchaseType,
          channel: "epay_alipay",
        }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) {
        throw new Error(intentData.error ?? `HTTP ${intentRes.status}`);
      }

      // 2. 走 EPay 拿到跳转 URL
      const epayRes = await fetch("/api/payment/epay/create", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          order_id: intentData.order.id,
          type: "alipay",
        }),
      });
      const epayData = await epayRes.json();
      if (!epayRes.ok) {
        // EPay 未启用时降级提示用户去手动渠道
        toast.error("自动渠道暂不可用", {
          description:
            (epayData.error ?? "未知") +
            "；请向下滚动用「微信/支付宝手动转账」渠道下单",
          duration: 8000,
        });
        return;
      }

      toast("跳转到支付页…", {
        description: "支付完成会返回 /console/billing/history",
      });
      // location.assign() instead of href= to satisfy react-hooks/immutability
      window.location.assign(epayData.payment_url as string);
    } catch (err) {
      toast.error("下单失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setPendingPlan(null);
    }
  }

  const isLegacy = currentPlan === "legacy_lifetime";

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">订阅方案</h2>
        <span className="text-[11px] text-zinc-500">
          当前：
          {currentPlan === "free" && (
            <span className="ml-1 rounded bg-zinc-100 px-2 py-0.5 font-medium">Free</span>
          )}
          {currentPlan === "plus" && (
            <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
              Plus · {subByPlan.plus && `还有 ${daysLeft(subByPlan.plus.currentPeriodEnd)} 天`}
            </span>
          )}
          {currentPlan === "pro" && (
            <span className="ml-1 rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
              Pro · {subByPlan.pro && `还有 ${daysLeft(subByPlan.pro.currentPeriodEnd)} 天`}
            </span>
          )}
          {isLegacy && (
            <span className="ml-1 rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-800">
              早期支持者 · 永久权益
            </span>
          )}
        </span>
      </div>

      {isLegacy && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
          🙏 你是临考最早一批支持者（19.9 单科永久购买），权益保留不变 · 等同
          Pro 不限次 · 还可以叠加月订阅给自己更宽松的额度
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(["free", "plus", "pro"] as const).map((p) => {
          const meta = PLAN_META[p];
          const tone = TONES[meta.color];
          const Icon = meta.icon;
          const isCurrent = currentPlan === p;
          const subRow = p === "free" ? undefined : subByPlan[p];

          return (
            <div
              key={p}
              className={`rounded-xl border p-5 shadow-sm transition ${tone.card} ${
                isCurrent ? `ring-2 ${tone.activeRing}` : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {isCurrent && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.pillBg} ${tone.pillText}`}>
                    当前
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold">{meta.name}</h3>

              {/* Pro card 显示月/年价格 — 年付默认选中，节省百分比作锚点 */}
              {p === "pro" ? (
                <>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">
                      {proCycle === "yearly" ? PRO_YEARLY_PRICE : meta.price}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {proCycle === "yearly" ? "/年" : "/月"}
                    </span>
                    {proCycle === "yearly" && (
                      <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                        省 {PRO_YEARLY_SAVE_PCT}%
                      </span>
                    )}
                  </div>
                  <div className="mt-2 inline-flex rounded-lg border border-emerald-200 bg-white p-0.5 text-[10px]">
                    {(["monthly", "yearly"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProCycle(c)}
                        className={`rounded px-2 py-1 transition ${
                          proCycle === c
                            ? "bg-emerald-700 text-white"
                            : "text-zinc-600 hover:bg-emerald-50"
                        }`}
                      >
                        {c === "monthly" ? "月付 ¥19.9" : `年付 ${PRO_YEARLY_PRICE}`}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight">
                    {meta.price}
                  </span>
                  <span className="text-xs text-zinc-500">{meta.cadence}</span>
                </div>
              )}

              <ul className="mt-3 space-y-1.5 text-xs text-zinc-700">
                {meta.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Pro 年付的挂科退款 nudge */}
              {p === "pro" && proCycle === "yearly" && !isLegacy && (
                <p className="mt-2 flex items-start gap-1 text-[10px] text-emerald-800">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                  年付适用挂科退款政策（完成 ≥ 80% 冲刺任务后挂科可申请）
                </p>
              )}

              <div className="mt-4">
                {p === "free" ? (
                  <button
                    type="button"
                    disabled
                    className={`w-full rounded-lg px-3 py-2 text-xs font-medium ${tone.btn}`}
                  >
                    默认免费档
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubscribe(p)}
                    disabled={pendingPlan !== null || isLegacy}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.btn}`}
                  >
                    {pendingPlan === p
                      ? "跳转支付中…"
                      : isLegacy
                        ? "已是 Pro 等同权益"
                        : subRow
                          ? p === "pro" && proCycle === "yearly"
                            ? `续费 +365 天（${PRO_YEARLY_PRICE}）`
                            : `续费 +30 天（${meta.price}）`
                          : p === "pro" && proCycle === "yearly"
                            ? `订阅 Pro 年卡（${PRO_YEARLY_PRICE}/年）`
                            : `订阅 ${meta.name}（${meta.price}/月）`}
                  </button>
                )}
                {subRow && (
                  <p className="mt-1.5 text-center text-[10px] text-zinc-500">
                    当前到期：{fmtDate(subRow.currentPeriodEnd)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-zinc-500">
        Plus / Pro 月付一次性 30 天 · Pro 年付一次性 365 天 · 不自动续费 ·
        到期前一周邮件提醒 · 月卡灵活，不喜欢可以下个月不续
      </p>
    </section>
  );
}

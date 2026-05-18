import Link from "next/link";
import {
  ArrowRight,
  Check,
  Crown,
  Sparkles,
  Zap,
} from "lucide-react";

type PlanKey = "free" | "plus" | "pro";

const PLAN_CARDS: Array<{
  key: PlanKey;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: { label: string; href: string };
  /** Tailwind tones — kept inline so the card styles are obvious at a glance. */
  tone: {
    card: string;
    accent: string;
    iconBg: string;
    cta: string;
    pill?: string;
  };
  featured?: boolean;
}> = [
  {
    key: "free",
    name: "Free",
    price: "¥0",
    cadence: "/月",
    tagline: "先免费跑通完整流程，确认有效再升级",
    features: [
      "PDF 提取 1 次 / 月",
      "AI 出题 20 次 / 月",
      "AI 批改 60 次 / 月",
      "冲刺计划 3 次 / 月",
      "学习历史 + 学科总览",
    ],
    cta: { label: "免费开始", href: "/register" },
    tone: {
      card: "border-zinc-200 bg-white",
      accent: "text-zinc-700",
      iconBg: "bg-zinc-100 text-zinc-700",
      cta: "bg-zinc-900 text-white hover:bg-zinc-800",
    },
  },
  {
    key: "plus",
    name: "Plus",
    price: "¥9.9",
    cadence: "/月",
    tagline: "日常练习 + 三学科全开，性价比首选",
    features: [
      "PDF 提取 5 次 / 月",
      "AI 出题 100 次 / 月",
      "AI 批改 300 次 / 月",
      "冲刺计划 10 次 / 月",
      "三学科全开（高数 / 线代 / 概率论）",
    ],
    cta: { label: "升级 Plus", href: "/console/billing" },
    tone: {
      card: "border-amber-300 bg-amber-50/40 ring-2 ring-amber-300",
      accent: "text-amber-900",
      iconBg: "bg-amber-100 text-amber-700",
      cta: "bg-amber-600 text-white hover:bg-amber-700",
      pill: "bg-amber-600 text-white",
    },
    featured: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: "¥19.9",
    cadence: "/月",
    tagline: "重要考试月按下不限次按钮",
    features: [
      "全部 AI 调用 不限次",
      "模拟卷优先使用 Opus 模型",
      "90 天历史记录保留",
      "所有学科解锁",
      "挂科退款政策（年付适用）",
    ],
    cta: { label: "升级 Pro", href: "/console/billing" },
    tone: {
      card: "border-emerald-300 bg-emerald-50/40",
      accent: "text-emerald-900",
      iconBg: "bg-emerald-100 text-emerald-700",
      cta: "bg-emerald-700 text-white hover:bg-emerald-800",
    },
  },
];

const ICONS: Record<PlanKey, typeof Sparkles> = {
  free: Sparkles,
  plus: Zap,
  pro: Crown,
};

export default function PricingCard() {
  return (
    <section className="border-b bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            按月订阅，灵活解锁
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            Free 永远免费试用 · Plus 三学科全开 · Pro 不限次。月付灵活，不喜欢可以下个月不续。
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PLAN_CARDS.map((plan) => {
            const Icon = ICONS[plan.key];
            return (
              <div
                key={plan.key}
                className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition ${plan.tone.card}`}
              >
                {plan.featured && (
                  <span
                    className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ${plan.tone.pill}`}
                  >
                    推荐
                  </span>
                )}

                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${plan.tone.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <h3 className={`mt-4 text-lg font-bold ${plan.tone.accent}`}>
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-zinc-500">{plan.cadence}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  {plan.tagline}
                </p>

                <ul className="mt-5 space-y-2 text-sm text-zinc-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta.href}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-sm transition ${plan.tone.cta}`}
                >
                  {plan.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs leading-6 text-zinc-500">
          🎁 早期支持者注意：已经买过 ¥19.9 单科永久的同学，权益不变 ·
          等同 Pro 不限次 · 还可叠加 Plus/Pro 月订阅升级额度。
          <br />
          所有 AI 输出仅作复习辅助参考，请以教材 / 老师讲义为准。
        </p>
      </div>
    </section>
  );
}

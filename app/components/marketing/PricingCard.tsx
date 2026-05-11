import { ArrowRight, Check, ShieldCheck } from "lucide-react";

const FEATURES = [
  "PDF 课件无限次提取（高数 / 线代 / 概率论 / 其他）",
  "AI 出题 + 批改 + 错题统计",
  "整卷模拟卷 + 12 题报告",
  "按考试日期定制 7-90 天冲刺计划",
  "KaTeX 数学公式渲染",
  "学习历史 + 学科总览（登录后）",
];

export default function PricingCard() {
  return (
    <section className="border-b bg-zinc-50">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            单科 19.9 元 · 挂科退款
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            MVP 内测期 · 试用永久免费，付费仅解锁历史落库 + 退款资格
          </p>
        </div>
        <div className="mt-10 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-zinc-900">¥19.9</span>
              <span className="text-sm text-zinc-600">/ 单科</span>
            </div>
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              完成 ≥80% 任务后挂科可全额退款（凭成绩单截图）
            </p>
          </div>
          <ul className="divide-y">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 px-5 py-3 text-sm"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="text-zinc-700">{f}</span>
              </li>
            ))}
          </ul>
          <div className="border-t bg-zinc-50 p-5 text-center">
            <a
              href="/pay"
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
            >
              立即下单
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-2 text-[10px] text-zinc-400">
              MVP 手动支付 · 易支付 / Stripe 全自动接入排在 Day 9+
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

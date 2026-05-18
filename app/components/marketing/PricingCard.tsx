import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";

const FEATURES = [
  "PDF 课件解析 1 次试用（高数 / 线代 / 概率论 / 其他）",
  "5 道 AI 练习题 + 批改反馈",
  "1 份逐日冲刺计划",
  "单科付费后解锁不限次使用",
  "最后三天可生成模拟卷",
  "学习历史 + 学科总览（登录后）",
];;

export default function PricingCard() {
  return (
    <section className="border-b bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            先试用，再决定要不要解锁单科
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            免费版能先看提纲和刷题效果，买了之后再开放不限次和模考。
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              免费试用
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>1 次课件解析，先看 AI 能不能提对重点。</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>5 道练习题 + 批改反馈，先感受刷题链路。</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>1 份逐日冲刺计划，先知道怎么安排时间。</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>不含模拟卷，先把最关键的前几步跑通。</span>
              </div>
            </div>
            <p className="mt-5 text-xs leading-6 text-zinc-500">
              试用阶段就会保留 AI 免责声明，输出内容仅供复习参考。
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="bg-[linear-gradient(180deg,#fff7ed_0%,#fffdf7_100%)] p-6">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-bold text-zinc-900">¥19.9</span>
                <span className="text-sm text-zinc-600">/ 单科</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700 shadow-sm">
                  先试再买
                </span>
              </div>
              <p className="mt-2 flex max-w-lg items-start gap-1.5 text-sm leading-7 text-zinc-700">
                <ShieldCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-700" />
                <span>
                  解锁后不限次解析、出题、批改、计划和模拟卷。完成 ≥80% 冲刺任务后仍挂科，可按条款申请退款。
                </span>
              </p>
            </div>

            <ul className="divide-y divide-zinc-200">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 px-5 py-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-zinc-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="border-t bg-zinc-50 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/pay"
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                >
                  去支付
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/console/practice"
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
                >
                  先去控制台试用
                </Link>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">
                付费后才解锁不限次和模拟卷。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

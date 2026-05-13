import { AlertTriangle, BadgeCheck, ListChecks, ShieldCheck } from "lucide-react";
import Link from "next/link";

import PayForm from "@/app/pay/PayForm";

export const runtime = "nodejs";

export default function ConsoleBillingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {/* Hero card */}
      <section className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white shadow-sm">
        <div className="grid items-center gap-3 p-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
              <BadgeCheck className="h-3 w-3" />
              单科解锁
            </div>
            <h1 className="mt-2 text-2xl font-bold">19.9 元 / 单科</h1>
            <p className="mt-1 text-xs text-zinc-600">
              含挂科退款条款 · 7 天考前解锁模拟卷 · 永久访问
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold tracking-tight text-amber-700">
              ¥19.9
            </span>
            <p className="mt-1 text-[11px] text-zinc-500">/ 单科 · 不限次</p>
          </div>
        </div>
      </section>

      {/* What you unlock */}
      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          单科解锁你能用到什么
        </h2>
        <ul className="space-y-1.5 pl-1 text-sm text-zinc-700">
          <li>✓ 每科无限次 PDF 课件提取 + 大纲生成（高数 / 线代 / 概率论 / 其他）</li>
          <li>✓ 每科无限次 AI 出题 + 整卷模拟卷（必考 / 重点 / 了解 三档）</li>
          <li>✓ 整卷批改 + 错题统计 + 易错点归类</li>
          <li>✓ 按考试日期 + 每日学时定制冲刺计划，最长 90 天</li>
          <li>✓ KaTeX 数学公式渲染（LaTeX 题目 / 答案 / 反馈全支持）</li>
        </ul>
      </section>

      {/* Refund policy */}
      <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          挂科退款条款
        </h2>
        <ul className="space-y-1.5 pl-1 text-sm text-zinc-700">
          <li>
            • <strong>退款资格</strong>
            ：完成冲刺计划 ≥ 80% 任务（含日常练习 + 模拟卷）后挂科，凭成绩单截图申请
          </li>
          <li>
            • <strong>退款方式</strong>：原路退回，3 个工作日内到账
          </li>
          <li>
            • <strong>不适用情况</strong>：任务完成度 &lt; 80%、缺考、单科结业评定后未达申请条件、申请超过出分后 7 天
          </li>
        </ul>
      </section>

      <div className="flex justify-end">
        <Link
          href="/console/billing/history"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          <ListChecks className="h-3.5 w-3.5" />
          查看历史订单
        </Link>
      </div>

      {/* Pay form */}
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">下单 · 选择渠道</h2>
        <p className="text-xs text-zinc-500">
          支持微信 / 支付宝（自动）+ 兑换码 + 手动转账。提交后会拿到订单号，自动渠道会跳转到支付平台。
        </p>
        <PayForm signedIn={true} />
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-900">
        <strong>⚠️ AI 免责声明</strong>
        ：临考所有 AI 输出（大纲 / 题目 / 解析 / 批改 / 冲刺计划）均仅作为辅助复习参考，请以教材 / 老师讲义 / 课程公告为准。我们不保证 AI 内容 100% 准确，不能替代教师授课与本人主动复习。
      </section>
    </div>
  );
}

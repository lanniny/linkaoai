import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "付费 · 临考 Linkao",
  description: "19.9 元 / 单科 · 挂科退款 · MVP 手动支付模式",
};

export default function PayPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-xs text-zinc-500 transition hover:underline"
        >
          ← 返回首页
        </Link>
        <h1 className="text-3xl font-bold">付费 · 19.9 元 / 单科</h1>
        <p className="text-sm text-zinc-600">
          挂科退款 · MVP 内测期可联系内部支付
        </p>
      </header>

      <section className="space-y-3 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">📋 单科解锁你能用到什么</h2>
        <ul className="space-y-1.5 text-sm text-zinc-700">
          <li>
            ✅ 每科无限次 PDF 课件提取 + 大纲生成（高数 / 线代 / 概率论 / 其他）
          </li>
          <li>✅ 每科无限次 AI 出题 + 整卷模拟卷（必考 / 重点 / 了解 三档）</li>
          <li>✅ 整卷批改 + 错题统计 + 易错点归类</li>
          <li>✅ 按考试日期 + 每日学时定制冲刺计划，最长 90 天</li>
          <li>✅ KaTeX 数学公式渲染（LaTeX 题目 / 答案 / 反馈全支持）</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">⚖️ 挂科退款条款</h2>
        <ul className="space-y-1.5 text-sm text-zinc-700">
          <li>
            • <strong>退款资格</strong>
            ：完成冲刺计划 ≥ 80% 任务（含日常练习 + 模拟卷）后挂科，凭成绩单截图申请
          </li>
          <li>
            • <strong>退款方式</strong>：原路退回，3 个工作日内到账
          </li>
          <li>
            • <strong>不适用情况</strong>
            ：任务完成度 &lt; 80%、缺考、单科结业评定后未达申请条件、申请超过出分后 7 天
          </li>
        </ul>
      </section>

      <section className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">💰 付款方式（MVP 手动模式）</h2>
        <p className="text-sm text-zinc-600">
          30 天 MVP 阶段暂未接入易支付 / Stripe 等自动支付，请通过下面流程：
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            加微信：
            <code className="ml-1 rounded bg-zinc-100 px-2 py-0.5 font-mono">
              your-wechat-id
            </code>
            <span className="ml-2 text-xs text-zinc-400">
              （占位，等待 founder 填入实际微信号）
            </span>
          </li>
          <li>
            备注「<strong>临考 + 学科 + 邮箱</strong>」（例：临考 高数
            you@example.com）
          </li>
          <li>转账 19.9 元 / 单科（可多科一起转，备注列全）</li>
          <li>24h 内开通账号 + 发送账户激活链接到你的邮箱</li>
        </ol>
        <p className="rounded bg-zinc-50 p-2 text-xs text-zinc-500">
          🔐 持久化账户系统 (Supabase auth + 历史记录) 计划在 Day 8+ 上线。
          内测期解锁直接绑定到邮箱，不需要先注册账号。
        </p>
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-900">
        <strong>⚠️ AI 免责声明</strong>
        ：临考所有 AI 输出（大纲 / 题目 / 解析 / 批改 / 冲刺计划）均仅作为辅助复习参考，请以教材 / 老师讲义 / 课程公告为准。我们不保证 AI 内容 100%
        准确，不能替代教师授课与本人主动复习。如有错误请反馈，会持续迭代。
      </section>

      <footer className="border-t pt-6 text-center text-xs text-zinc-400">
        <Link href="/" className="transition hover:underline">
          临考 · linkaoai.com
        </Link>
      </footer>
    </main>
  );
}

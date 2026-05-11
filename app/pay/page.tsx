import Link from "next/link";
import type { Metadata } from "next";

import PayForm from "./PayForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "付费 · 临考 Linkao",
  description: "19.9 元 / 单科 · 挂科退款 · MVP 手动支付模式",
};

export const runtime = "nodejs";

async function getSession() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export default async function PayPage() {
  const user = await getSession();
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
        <h2 className="text-lg font-semibold">💰 下单（MVP 手动模式）</h2>
        <p className="text-sm text-zinc-600">
          选择学科 + 付款渠道，提交后会拿到一个订单号；
          联系微信
          <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
            your-wechat-id
          </code>
          发送订单号 + 转账截图，我们 24h 内开通账户。
        </p>
        <PayForm signedIn={!!user} />
        {!user && (
          <p className="text-xs text-zinc-500">
            （下单需要先登录 ·{" "}
            <Link href="/login?next=/pay" className="underline">
              去登录
            </Link>
            ）
          </p>
        )}
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

import { AlertTriangle, ListChecks } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { getUserPlan, listActiveSubscriptions } from "@/lib/subscription";

import { SubscriptionPlans } from "./SubscriptionPlans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ConsoleBillingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  // 拿当前 plan + 所有 active 订阅（serializable to client component）
  const [currentPlan, activeRows] = await Promise.all([
    getUserPlan(userId),
    userId ? listActiveSubscriptions(userId) : Promise.resolve([]),
  ]);
  const activeSubs = activeRows
    .filter((r) => r.plan === "plus" || r.plan === "pro")
    .map((r) => ({
      id: r.id,
      plan: r.plan as "plus" | "pro",
      currentPeriodEnd: r.currentPeriodEnd
        ? new Date(r.currentPeriodEnd).getTime()
        : 0,
    }));

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      {/* Subscription plans (3 cards) — 主要支付入口 */}
      <SubscriptionPlans currentPlan={currentPlan} activeSubs={activeSubs} />

      {/* Refund policy */}
      <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          挂科退款条款（Pro 年付适用）
        </h2>
        <ul className="space-y-1.5 pl-1 text-sm text-zinc-700">
          <li>
            • <strong>退款资格</strong>：Pro 年付用户，完成冲刺计划 ≥ 80%
            任务（含日常练习 + 模拟卷）后挂科，凭成绩单截图申请
          </li>
          <li>
            • <strong>退款方式</strong>：按未使用月份比例原路退回，3 个工作日内到账
          </li>
          <li>
            • <strong>不适用情况</strong>：Plus / Pro 月付订阅、任务完成度 &lt; 80%、缺考、
            单科结业评定后未达申请条件、申请超过出分后 7 天
          </li>
          <li className="text-xs text-amber-800">
            • <strong>月付灵活原则</strong>：月付不在挂科退款范围内，但你随时可以
            下个月不续 — 不喜欢就停掉，不会自动扣款
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

      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-900">
        <strong>⚠️ AI 免责声明</strong>
        ：临考所有 AI 输出（大纲 / 题目 / 解析 / 批改 / 冲刺计划）均仅作为辅助复习参考，请以教材 / 老师讲义 / 课程公告为准。我们不保证 AI 内容 100% 准确，不能替代教师授课与本人主动复习。
      </section>
    </div>
  );
}

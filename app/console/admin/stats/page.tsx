import { desc, gte, sql } from "drizzle-orm";
import { BarChart3 } from "lucide-react";

import { aiUsageLogs, db, payments, user } from "@/lib/db";
import { StatsCharts } from "./StatsCharts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminStatsPage() {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400 * 1000);

  const [allPayments, allUsers, allLogs] = await Promise.all([
    db
      .select({
        amountCny: payments.amountCny,
        subject: payments.subject,
        status: payments.status,
        createdAt: payments.createdAt,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(gte(payments.createdAt, thirtyDaysAgo))
      .orderBy(desc(payments.createdAt)),
    db
      .select({ createdAt: user.createdAt })
      .from(user)
      .where(gte(user.createdAt, thirtyDaysAgo))
      .orderBy(desc(user.createdAt)),
    db
      .select({
        model: aiUsageLogs.model,
        createdAt: aiUsageLogs.createdAt,
        promptTokens: aiUsageLogs.promptTokens,
        completionTokens: aiUsageLogs.completionTokens,
      })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, thirtyDaysAgo))
      .orderBy(desc(aiUsageLogs.createdAt)),
    db.select({ n: sql<number>`count(*)` }).from(user),
  ]);

  // Build 30-day buckets
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(ymd(new Date(now - i * 86400 * 1000)));
  }

  const revenueByDay: Record<string, number> = Object.fromEntries(
    days.map((d) => [d, 0]),
  );
  const signupsByDay: Record<string, number> = Object.fromEntries(
    days.map((d) => [d, 0]),
  );
  for (const p of allPayments) {
    if (p.status !== "paid" || !p.paidAt) continue;
    const k = ymd(new Date(p.paidAt));
    if (k in revenueByDay) revenueByDay[k] += Number(p.amountCny) || 0;
  }
  for (const u of allUsers) {
    if (!u.createdAt) continue;
    const k = ymd(new Date(u.createdAt));
    if (k in signupsByDay) signupsByDay[k] += 1;
  }

  // Subject distribution (paid orders)
  const subjectCounts: Record<string, number> = {};
  for (const p of allPayments) {
    if (p.status !== "paid") continue;
    subjectCounts[p.subject] = (subjectCounts[p.subject] ?? 0) + 1;
  }

  // Model usage stacked area (tokens / day / model)
  const modelByDay: Record<string, Record<string, number>> = {};
  for (const d of days) modelByDay[d] = {};
  for (const log of allLogs) {
    if (!log.createdAt) continue;
    const k = ymd(new Date(log.createdAt));
    if (!(k in modelByDay)) continue;
    const tokens =
      (Number(log.promptTokens) || 0) + (Number(log.completionTokens) || 0);
    modelByDay[k]![log.model] = (modelByDay[k]![log.model] ?? 0) + tokens;
  }
  const allModels = Array.from(
    new Set(allLogs.map((l) => l.model)),
  ).slice(0, 5);

  const revenueSeries = days.map((d) => ({
    date: d.slice(5),
    cny: revenueByDay[d],
  }));
  const signupSeries = days.map((d) => ({
    date: d.slice(5),
    count: signupsByDay[d],
  }));
  const subjectSeries = Object.entries(subjectCounts).map(([name, value]) => ({
    name,
    value,
  }));
  const modelSeries = days.map((d) => {
    const row: Record<string, number | string> = { date: d.slice(5) };
    for (const m of allModels) row[m] = modelByDay[d]?.[m] ?? 0;
    return row;
  });

  const totalRevenue = Object.values(revenueByDay).reduce(
    (s, n) => s + n,
    0,
  );
  const totalSignups = Object.values(signupsByDay).reduce((s, n) => s + n, 0);
  const totalPaidCount = subjectSeries.reduce((s, r) => s + r.value, 0);
  const totalTokens = Object.values(modelByDay)
    .flatMap((r) => Object.values(r))
    .reduce((s, n) => s + n, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <BarChart3 className="h-4 w-4" />
          数据看板 · 最近 30 天
        </h2>
        <p className="text-xs text-zinc-500">
          收入趋势 · 注册趋势 · 学科分布 · 模型 token 用量
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">30d 收入</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">
            ¥{totalRevenue.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">30d 新增</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">
            {totalSignups}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">30d 已付订单</div>
          <div className="mt-1 text-2xl font-bold text-purple-700">
            {totalPaidCount}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">30d 总 tokens</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">
            {totalTokens.toLocaleString()}
          </div>
        </div>
      </section>

      <StatsCharts
        revenue={revenueSeries}
        signups={signupSeries}
        subjects={subjectSeries}
        models={modelSeries}
        modelKeys={allModels}
      />
    </div>
  );
}

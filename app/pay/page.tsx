import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 旧版 /pay 单科购买页已淘汰（19.9 单科一次性买断 → Free/Plus/Pro 月订阅，
 * 2026-05-19 主人决策）。保留路由作为 EPay return_url 兼容入口 + 老书签
 * 友好跳转：透传 ?return=... &order=... 等 query 到 /console/billing/history
 * 让用户能继续看到支付结果。
 *
 * PayForm 组件源码 (app/pay/PayForm.tsx) 暂保留 — admin 或未来恢复单科
 * 促销时可重新接入；当前生产没有页面引用它。
 */
interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PayRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.append(k, v);
  }
  const tail = qs.toString();
  redirect(tail ? `/console/billing/history?${tail}` : "/console/billing");
}

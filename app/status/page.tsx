import { sql } from "drizzle-orm";
import { CheckCircle2, CircleAlert, Sparkles, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { readSetting } from "@/lib/system-settings";

export const metadata: Metadata = {
  title: "服务状态 · 临考 Linkao",
  description: "Linkao 各项服务的实时健康状态",
};

export const runtime = "nodejs";
// Cache 30s — protects against status-page DDoS while keeping numbers fresh.
export const revalidate = 30;

type Status = "ok" | "warn" | "down";

interface Check {
  name: string;
  status: Status;
  detail: string;
  latencyMs?: number;
}

async function pingHttp(url: string, timeoutMs = 5000): Promise<Check> {
  const start = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });
    const latency = Date.now() - start;
    if (res.status >= 500) {
      return {
        name: url,
        status: "down",
        detail: `HTTP ${res.status}`,
        latencyMs: latency,
      };
    }
    return {
      name: url,
      status: "ok",
      detail: `HTTP ${res.status}`,
      latencyMs: latency,
    };
  } catch (err) {
    return {
      name: url,
      status: "down",
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  } finally {
    clearTimeout(t);
  }
}

function checkDb(): Check {
  const start = Date.now();
  try {
    const rows = db.all(sql`SELECT 1 as ok`) as { ok: number }[];
    if (rows[0]?.ok === 1) {
      return {
        name: "SQLite",
        status: "ok",
        detail: "responds to SELECT 1",
        latencyMs: Date.now() - start,
      };
    }
    return {
      name: "SQLite",
      status: "warn",
      detail: "unexpected response shape",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "SQLite",
      status: "down",
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

function statusIcon(s: Status) {
  if (s === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (s === "warn") return <CircleAlert className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-red-600" />;
}

function statusLabel(s: Status) {
  if (s === "ok") return "正常";
  if (s === "warn") return "异常";
  return "宕机";
}

function statusTint(s: Status) {
  if (s === "ok") return "border-emerald-200 bg-emerald-50/50";
  if (s === "warn") return "border-amber-200 bg-amber-50/50";
  return "border-red-200 bg-red-50/50";
}

export default async function StatusPage() {
  const anthropicBase = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";

  const [dbCheck, anthropicCheck, maintenance] = await Promise.all([
    Promise.resolve(checkDb()),
    pingHttp(anthropicBase, 5000),
    readSetting("maintenance"),
  ]);

  const checks: Check[] = [
    { ...dbCheck, name: "数据库 · SQLite" },
    { ...anthropicCheck, name: "Anthropic 中转 · " + new URL(anthropicBase).hostname },
  ];

  // Overall status = worst single check, unless explicit maintenance flag.
  const overall: Status = maintenance.enabled
    ? "warn"
    : checks.some((c) => c.status === "down")
      ? "down"
      : checks.some((c) => c.status === "warn")
        ? "warn"
        : "ok";

  const overallLabel = maintenance.enabled
    ? "维护中"
    : overall === "ok"
      ? "全部服务正常"
      : overall === "warn"
        ? "部分服务异常"
        : "服务不可用";

  const overallTint = maintenance.enabled
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : overall === "ok"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : overall === "warn"
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-red-300 bg-red-50 text-red-900";

  const checkedAt = new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold tracking-tight">临考 · 状态</span>
          </Link>
          <p className="mt-1 text-xs text-zinc-500">
            实时健康检查 · 缓存 30 秒 · 检查时间 {checkedAt} (UTC+8)
          </p>
        </header>

        <section
          className={`rounded-2xl border p-6 shadow-sm ${overallTint}`}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
              {statusIcon(overall)}
            </span>
            <div>
              <h2 className="text-xl font-bold">{overallLabel}</h2>
              <p className="text-xs">
                {maintenance.enabled
                  ? maintenance.message || "运维正在升级，请稍后再试"
                  : `${checks.filter((c) => c.status === "ok").length} / ${checks.length} 项检查通过`}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          {checks.map((c, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${statusTint(c.status)}`}
            >
              <div className="flex items-center gap-3">
                {statusIcon(c.status)}
                <div>
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <p className="text-[11px] text-zinc-600">{c.detail}</p>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <div className="font-medium">{statusLabel(c.status)}</div>
                {c.latencyMs != null && (
                  <div className="font-mono text-[10px]">{c.latencyMs}ms</div>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 text-xs leading-relaxed text-zinc-600 shadow-sm">
          <p>
            <strong>关于此页：</strong>
            状态由 Next.js server-side 检查；缓存 30 秒以避免压力穿透。
          </p>
          <p className="mt-1">
            如果你正在调用 AI 但反复失败，先看这里 ·
            如果这里全绿但你仍异常，请刷新或者{" "}
            <a
              href="mailto:linkao@linkaoai.com"
              className="underline underline-offset-2"
            >
              联系 linkao@linkaoai.com
            </a>
            。
          </p>
        </section>

        <p className="text-center text-[11px] text-zinc-400">
          <Link href="/" className="underline-offset-2 hover:underline">
            返回首页
          </Link>{" "}
          · 临考 · linkaoai.com
        </p>
      </div>
    </main>
  );
}

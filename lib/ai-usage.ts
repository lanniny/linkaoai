import "server-only";

import { and, eq } from "drizzle-orm";

import { aiUsageLogs, db, usageCounters } from "@/lib/db";

/**
 * M4 mirror · AI usage telemetry.
 *
 * Emits one row per /api/extract /api/generate-questions /api/grade
 * /api/sprint-plan invocation. Designed to never throw — telemetry failures
 * must not break the user-facing AI call.
 *
 * Cost estimate uses Anthropic public pricing (USD per 1M tokens),
 * converted at a flat 7.2 RMB/USD for finance reporting.
 */

type Route = "extract" | "generate_questions" | "grade" | "sprint_plan";
type Status = "success" | "error" | "timeout" | "blocked";

const PRICING_USD_PER_M: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

const USD_TO_CNY = 7.2;

export function estimateCostCny(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const price = PRICING_USD_PER_M[model];
  if (!price) return 0;
  const usd =
    (promptTokens / 1_000_000) * price.input +
    (completionTokens / 1_000_000) * price.output;
  return Math.round(usd * USD_TO_CNY * 10000) / 10000;
}

export interface EmitArgs {
  userId: string | null;
  channelId?: string | null;
  route: Route;
  model: string;
  status: Status;
  latencyMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  errorMessage?: string | null;
}

export async function emitAiUsage(args: EmitArgs): Promise<void> {
  try {
    const cost_cny =
      args.promptTokens != null && args.completionTokens != null
        ? estimateCostCny(args.model, args.promptTokens, args.completionTokens)
        : null;

    await db.insert(aiUsageLogs).values({
      userId: args.userId,
      channelId: args.channelId ?? null,
      route: args.route,
      model: args.model,
      status: args.status,
      latencyMs: args.latencyMs ?? null,
      promptTokens: args.promptTokens ?? null,
      completionTokens: args.completionTokens ?? null,
      costCny: cost_cny,
      errorMessage: args.errorMessage ?? null,
    });
  } catch (err) {
    console.warn(
      "[ai-usage] insert failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Atomic monthly counter bump using upsert (SQLite ON CONFLICT). */
export async function incUsageCounter(
  userId: string,
  kind: "extract" | "generate_questions" | "grade" | "sprint_plan",
): Promise<void> {
  try {
    const today = new Date();
    const monthYmd = `${today.getUTCFullYear()}-${String(
      today.getUTCMonth() + 1,
    ).padStart(2, "0")}-01`;

    const existing = await db
      .select({ usedN: usageCounters.usedN })
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.userId, userId),
          eq(usageCounters.monthYmd, monthYmd),
          eq(usageCounters.kind, kind),
        ),
      )
      .limit(1);

    const next = (existing[0]?.usedN ?? 0) + 1;
    await db
      .insert(usageCounters)
      .values({
        userId,
        monthYmd,
        kind,
        usedN: next,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          usageCounters.userId,
          usageCounters.monthYmd,
          usageCounters.kind,
        ],
        set: { usedN: next, updatedAt: new Date() },
      });
  } catch (err) {
    console.warn(
      "[usage-counter] upsert failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

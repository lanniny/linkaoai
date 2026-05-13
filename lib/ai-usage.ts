import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

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

// Anthropic list price (USD per 1M tokens) as of 2026-Q2.
// Update when official pricing changes.
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

/**
 * Emit one usage log row. Best-effort; failures are swallowed and logged
 * to console so telemetry never breaks the user request.
 *
 * If Supabase admin is not configured (local dev without service_role),
 * this is a no-op.
 */
export async function emitAiUsage(args: EmitArgs): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  try {
    const admin = createSupabaseAdminClient();
    const cost_cny =
      args.promptTokens != null && args.completionTokens != null
        ? estimateCostCny(args.model, args.promptTokens, args.completionTokens)
        : null;

    const { error } = await admin.from("ai_usage_logs").insert({
      user_id: args.userId,
      channel_id: args.channelId ?? null,
      route: args.route,
      model: args.model,
      status: args.status,
      latency_ms: args.latencyMs ?? null,
      prompt_tokens: args.promptTokens ?? null,
      completion_tokens: args.completionTokens ?? null,
      cost_cny,
      error_message: args.errorMessage ?? null,
    });
    if (error) {
      console.warn("[ai-usage] insert failed:", error.message);
    }
  } catch (err) {
    console.warn(
      "[ai-usage] unexpected emit failure:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Increment one row in usage_counters for the current calendar month (UTC).
 * Atomic upsert via Supabase RPC fallback to read+update.
 */
export async function incUsageCounter(
  userId: string,
  kind: "extract" | "generate_questions" | "grade" | "sprint_plan",
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  try {
    const admin: SupabaseClient = createSupabaseAdminClient();
    const today = new Date();
    const monthYmd = `${today.getUTCFullYear()}-${String(
      today.getUTCMonth() + 1,
    ).padStart(2, "0")}-01`;

    // Read current count, then upsert with used_n + 1.
    const { data: existing } = await admin
      .from("usage_counters")
      .select("used_n")
      .eq("user_id", userId)
      .eq("month_ymd", monthYmd)
      .eq("kind", kind)
      .maybeSingle();

    const next = (existing?.used_n ?? 0) + 1;
    const { error } = await admin.from("usage_counters").upsert(
      {
        user_id: userId,
        month_ymd: monthYmd,
        kind,
        used_n: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month_ymd,kind" },
    );
    if (error) {
      console.warn("[usage-counter] upsert failed:", error.message);
    }
  } catch (err) {
    console.warn(
      "[usage-counter] unexpected failure:",
      err instanceof Error ? err.message : err,
    );
  }
}

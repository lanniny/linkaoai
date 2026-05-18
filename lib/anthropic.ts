import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { and, asc, eq, like } from "drizzle-orm";

import { aiChannels, db } from "@/lib/db";

/**
 * Endpoint policy (revised 2026-05-11, see memory/feedback_official_apis_only.md):
 * Founder explicitly approved routing Anthropic via openclaudecode.cn 中转.
 * We still refuse arbitrary unknown hosts to prevent silent misconfig in CI/Vercel
 * AND to defend against bad rows in ai_channels (admin typos / pasted bad URLs).
 */
const OFFICIAL_BASE = "https://api.anthropic.com";
const ALLOWED_HOST_SUFFIXES = [
  "api.anthropic.com",
  "openclaudecode.cn",
] as const;

export function assertOfficialEndpoint(url?: string): void {
  const raw = url ?? process.env.ANTHROPIC_BASE_URL ?? OFFICIAL_BASE;
  let host: string;
  try {
    host = new URL(raw).host;
  } catch {
    throw new Error(`[linkao] ANTHROPIC base URL is not a valid URL: ${raw}`);
  }
  const ok = ALLOWED_HOST_SUFFIXES.some(
    (suf) => host === suf || host.endsWith(`.${suf}`),
  );
  if (!ok) {
    throw new Error(
      `[linkao] ANTHROPIC base host "${host}" is not whitelisted. Allowed: ${ALLOWED_HOST_SUFFIXES.join(", ")}.`,
    );
  }
}

// openclaudecode.cn 中转前置的 Cloudflare WAF 会把 SDK 默认 `User-Agent: Anthropic/JS …`
// 当作 bot 直接 403（实测 2026-05-11：小请求都过不去，跟 size/PDF 无关）。
// 注入浏览器 UA 后单次 1.7 MB PDF base64 请求 12s 内 200 — 该 UA 是中转链路必需配置。
// 若以后切回 api.anthropic.com 官方端点，此 UA 也无害（Anthropic 官方不基于 UA 鉴权）。
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function buildClient(baseURL: string): Anthropic {
  assertOfficialEndpoint(baseURL);
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL,
    defaultHeaders: { "User-Agent": BROWSER_UA },
  });
}

/**
 * Channel role — which "slot" an AI route consumes.
 *   primary → Opus-class, used for /api/extract (vision PDF parsing) and
 *             /api/sprint-plan (the only routes that justify Opus cost).
 *   bulk    → Haiku-class, used for /api/generate-questions and /api/grade
 *             (high-volume, cost-sensitive).
 *
 * Admins seed ai_channels with rows like (model="claude-opus-4-7", priority=100);
 * resolveChannel picks the highest-priority enabled row whose model name
 * contains the family keyword. If no row matches we fall back to env-driven
 * MODELS — keeps dev / CI working without DB rows.
 */
export type ChannelRole = "primary" | "bulk";

export interface ResolvedChannel {
  channelId: string | null; // null when falling back to env (no DB row)
  baseUrl: string;
  model: string;
  client: Anthropic;
}

const ROLE_MODEL_FAMILY: Record<ChannelRole, "opus" | "haiku"> = {
  primary: "opus",
  bulk: "haiku",
};

const ENV_MODEL: Record<ChannelRole, string> = {
  primary: process.env.ANTHROPIC_MODEL_PRIMARY ?? "claude-opus-4-7",
  bulk: process.env.ANTHROPIC_MODEL_BULK ?? "claude-haiku-4-5-20251001",
};

async function pickChannelRow(
  role: ChannelRole,
): Promise<{ id: string; baseUrl: string; model: string } | null> {
  const family = ROLE_MODEL_FAMILY[role];
  try {
    // Priority semantics mirror new-api: ASCENDING — smaller integer wins
    // (priority=0 / 1 are the "main" channels, larger values are fallback).
    // The admin UI page at /console/admin/channels says "按 priority 升序选用"
    // and orders the table the same way; keep them in lockstep.
    const rows = await db
      .select({
        id: aiChannels.id,
        baseUrl: aiChannels.baseUrl,
        model: aiChannels.model,
      })
      .from(aiChannels)
      .where(
        and(
          eq(aiChannels.enabled, true),
          like(aiChannels.model, `%${family}%`),
        ),
      )
      .orderBy(asc(aiChannels.priority))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    // Treat any DB error as "no channel row" so env fallback applies —
    // we never want a transient DB hiccup to block AI calls.
    console.warn(
      "[anthropic] pickChannelRow failed, falling back to env:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Returns a ready-to-use Anthropic client + the model name to pass to
 * messages.create(). Caller should record success/failure via
 * markChannel{Ok,Error}() (fire-and-forget) so admins can see health
 * at /console/admin/channels.
 */
export async function resolveChannel(
  role: ChannelRole,
): Promise<ResolvedChannel> {
  const row = await pickChannelRow(role);
  if (row) {
    return {
      channelId: row.id,
      baseUrl: row.baseUrl,
      model: row.model,
      client: buildClient(row.baseUrl),
    };
  }
  const fallbackBase = process.env.ANTHROPIC_BASE_URL ?? OFFICIAL_BASE;
  return {
    channelId: null,
    baseUrl: fallbackBase,
    model: ENV_MODEL[role],
    client: buildClient(fallbackBase),
  };
}

/** Bumps last_ok_at on the channel row, swallowing errors. */
export async function markChannelOk(
  channelId: string | null,
): Promise<void> {
  if (!channelId) return;
  try {
    await db
      .update(aiChannels)
      .set({ lastOkAt: new Date(), lastError: null })
      .where(eq(aiChannels.id, channelId));
  } catch (err) {
    console.warn(
      "[anthropic] markChannelOk failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Records the latest error message on the channel row, swallowing errors. */
export async function markChannelError(
  channelId: string | null,
  message: string,
): Promise<void> {
  if (!channelId) return;
  try {
    await db
      .update(aiChannels)
      .set({ lastError: message.slice(0, 500) })
      .where(eq(aiChannels.id, channelId));
  } catch (err) {
    console.warn(
      "[anthropic] markChannelError failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * @deprecated Use resolveChannel(role) so admins can swap providers without
 * restarting. Legacy module-scope client kept while we migrate; should
 * disappear once all AI routes call resolveChannel.
 */
export const anthropic = buildClient(
  process.env.ANTHROPIC_BASE_URL ?? OFFICIAL_BASE,
);

/**
 * @deprecated env-only constants; per-request use resolveChannel(role).model
 * instead so the admin UI can swap models without a redeploy.
 */
export const MODELS = {
  primary: ENV_MODEL.primary,
  bulk: ENV_MODEL.bulk,
} as const;

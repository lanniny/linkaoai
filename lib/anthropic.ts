import Anthropic from "@anthropic-ai/sdk";

/**
 * Compliance: only the official Anthropic endpoint. Never proxy/transit/resale.
 * See ops/day0-account-prerequisite.md and memory/feedback_official_apis_only.md.
 */
const OFFICIAL_BASE = "https://api.anthropic.com";

export function assertOfficialEndpoint(): void {
  const url = process.env.ANTHROPIC_BASE_URL ?? OFFICIAL_BASE;
  if (!url.startsWith(OFFICIAL_BASE)) {
    throw new Error(
      `[linkao] ANTHROPIC_BASE_URL must be the official endpoint (${OFFICIAL_BASE}). Got: ${url}`,
    );
  }
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL ?? OFFICIAL_BASE,
});

export const MODELS = {
  primary: process.env.ANTHROPIC_MODEL_PRIMARY ?? "claude-opus-4-7",
  bulk: process.env.ANTHROPIC_MODEL_BULK ?? "claude-haiku-4-5-20251001",
} as const;

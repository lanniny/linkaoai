import Anthropic from "@anthropic-ai/sdk";

/**
 * Endpoint policy (revised 2026-05-11, see memory/feedback_official_apis_only.md):
 * Founder explicitly approved routing Anthropic via openclaudecode.cn 中转.
 * We still refuse arbitrary unknown hosts to prevent silent misconfig in CI/Vercel.
 */
const OFFICIAL_BASE = "https://api.anthropic.com";
const ALLOWED_HOST_SUFFIXES = [
  "api.anthropic.com",
  "openclaudecode.cn",
] as const;

export function assertOfficialEndpoint(): void {
  const raw = process.env.ANTHROPIC_BASE_URL ?? OFFICIAL_BASE;
  let host: string;
  try {
    host = new URL(raw).host;
  } catch {
    throw new Error(`[linkao] ANTHROPIC_BASE_URL is not a valid URL: ${raw}`);
  }
  const ok = ALLOWED_HOST_SUFFIXES.some(
    (suf) => host === suf || host.endsWith(`.${suf}`),
  );
  if (!ok) {
    throw new Error(
      `[linkao] ANTHROPIC_BASE_URL host "${host}" is not whitelisted. Allowed: ${ALLOWED_HOST_SUFFIXES.join(", ")}.`,
    );
  }
}

// openclaudecode.cn 中转前置的 Cloudflare WAF 会把 SDK 默认 `User-Agent: Anthropic/JS …`
// 当作 bot 直接 403（实测 2026-05-11：小请求都过不去，跟 size/PDF 无关）。
// 注入浏览器 UA 后单次 1.7 MB PDF base64 请求 12s 内 200 — 该 UA 是中转链路必需配置。
// 若以后切回 api.anthropic.com 官方端点，此 UA 也无害（Anthropic 官方不基于 UA 鉴权）。
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL ?? OFFICIAL_BASE,
  defaultHeaders: {
    "User-Agent": BROWSER_UA,
  },
});

export const MODELS = {
  primary: process.env.ANTHROPIC_MODEL_PRIMARY ?? "claude-opus-4-7",
  bulk: process.env.ANTHROPIC_MODEL_BULK ?? "claude-haiku-4-5-20251001",
} as const;

import "server-only";

import { estimateCostCny, incUsageCounter } from "@/lib/ai-usage";
import type { QuotaKind, QuotaStatus } from "@/lib/quota";
import { cnyToCents, consume } from "@/lib/wallet";

/**
 * AI 调用成功后的"计费"决策点。集中处理 quota / wallet / unlimited 三条
 * 资金来源路径，避免 4 个 AI route 重复同样的 if/else。
 *
 *   source='quota'      → free/plus 月配额 — incUsageCounter 计数
 *   source='wallet'     → 配额耗尽降级钱包 — 按 cost_cny 扣分（cents）
 *   source='unlimited'  → Pro / legacy / anon — 不计费
 *   source=undefined    → quota allowed=false 不应该走到这里（route 已 429）
 *
 * 扣款失败不抛错（fire-and-forget telemetry pattern），但会 console.warn。
 * 余额不足只在 checkQuota 早判（理论上 quota.source='wallet' 已经表示余额>0），
 * 但万一并发场景余额刚被扣完，这里 consume 返回 ok=false，本次 AI 成功用户
 * "免单"一次 — 比让用户失败更友好。
 */
export async function chargeUsage(args: {
  userId: string | null;
  quotaSource: QuotaStatus["source"];
  kind: QuotaKind;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
}): Promise<void> {
  if (!args.userId) return;
  if (args.quotaSource === "unlimited") return;
  if (args.quotaSource === "quota") {
    void incUsageCounter(args.userId, args.kind);
    return;
  }
  if (args.quotaSource === "wallet") {
    if (args.promptTokens == null || args.completionTokens == null) {
      // 无 token usage 信息 → 跳过扣费（保守，不乱扣）
      return;
    }
    const costCny = estimateCostCny(
      args.model,
      args.promptTokens,
      args.completionTokens,
    );
    const cents = cnyToCents(costCny);
    if (cents <= 0) return;
    try {
      const result = await consume({
        userId: args.userId,
        amountCents: cents,
        description: `${args.kind} · ${args.model} · ${args.promptTokens}+${args.completionTokens} tokens`,
      });
      if (!result.ok) {
        console.warn(
          `[charge] wallet exhausted mid-flight for user=${args.userId} kind=${args.kind} cents=${cents} balance=${result.balance}`,
        );
      }
    } catch (err) {
      console.warn(
        "[charge] wallet consume failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

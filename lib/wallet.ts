import "server-only";

import { desc, eq, gte, sql } from "drizzle-orm";

import { db, walletBalance, walletTransactions } from "@/lib/db";

/**
 * Pay-as-you-go 钱包模块。
 *
 * 货币单位：分 (cents)。1.00 元 = 100 cents。
 * AI cost_cny (float) → 落地前 cnyToCents() 转 cents int 防浮点误差。
 *
 * 原子性：充值/扣款都用 SQL atomic update + RETURNING 拿新余额，避免 race
 * condition（better-sqlite3 同步 + SQLite 单线程 + WAL 保证）。
 *
 * 扣款语义：余额不足时返回 { ok: false, balance: <当前余额> } 不抛错，让
 * 调用方决定如何降级（AI route 应当走配额或返回 402 Payment Required）。
 */

export type TxnType = "topup" | "consume" | "refund";

export interface TxnRow {
  id: string;
  type: TxnType;
  amountCents: number;
  balanceAfterCents: number;
  paymentId: string | null;
  usageLogId: string | null;
  description: string | null;
  createdAt: Date | null;
}

/** ¥1.0 → 100 cents。round 防 ¥0.1234 这种 float 噪声。 */
export function cnyToCents(cny: number): number {
  return Math.round(cny * 100);
}

export function centsToCny(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * 返回用户当前余额（cents）。没行就返 0，不强制创建行。
 */
export async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balanceCents: walletBalance.balanceCents })
    .from(walletBalance)
    .where(eq(walletBalance.userId, userId))
    .limit(1);
  return row?.balanceCents ?? 0;
}

/**
 * 充值。原子语义：UPSERT balance += amount，写一条 type='topup' 流水。
 * amountCents 必须 > 0。
 *
 * 返回新余额。失败抛错（让 caller 决定重试 / 回滚 payment）。
 */
export async function topup(args: {
  userId: string;
  amountCents: number;
  paymentId?: string | null;
  description?: string;
}): Promise<{ balanceAfterCents: number }> {
  if (args.amountCents <= 0) {
    throw new Error(
      `[wallet.topup] amountCents must be > 0, got ${args.amountCents}`,
    );
  }

  // UPSERT — onConflictDoUpdate (SQLite INSERT OR REPLACE 风格但保留其他列)
  await db
    .insert(walletBalance)
    .values({
      userId: args.userId,
      balanceCents: args.amountCents,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: walletBalance.userId,
      set: {
        balanceCents: sql`${walletBalance.balanceCents} + ${args.amountCents}`,
        updatedAt: new Date(),
      },
    });

  // 拿当前余额（atomic 写入后的值）
  const balanceAfter = await getBalance(args.userId);

  await db.insert(walletTransactions).values({
    userId: args.userId,
    type: "topup",
    amountCents: args.amountCents,
    balanceAfterCents: balanceAfter,
    paymentId: args.paymentId ?? null,
    description: args.description ?? null,
  });

  return { balanceAfterCents: balanceAfter };
}

/**
 * 扣款。原子 CAS：UPDATE balance -= amount WHERE balance >= amount。
 *
 * 余额不足 → 返回 { ok: false, balance } 不抛错。
 * 余额足够 → 返回 { ok: true, balanceAfterCents } 并写流水。
 */
export async function consume(args: {
  userId: string;
  amountCents: number;
  usageLogId?: string | null;
  description?: string;
}): Promise<
  | { ok: true; balanceAfterCents: number }
  | { ok: false; balance: number; needed: number }
> {
  if (args.amountCents <= 0) {
    // 0 cost 调用（缓存命中等）不扣不写流水
    return {
      ok: true,
      balanceAfterCents: await getBalance(args.userId),
    };
  }

  // Atomic CAS update — better-sqlite3 是同步的，单事务内 race-safe
  const updated = await db
    .update(walletBalance)
    .set({
      balanceCents: sql`${walletBalance.balanceCents} - ${args.amountCents}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${walletBalance.userId} = ${args.userId} AND ${walletBalance.balanceCents} >= ${args.amountCents}`,
    )
    .returning({ balanceCents: walletBalance.balanceCents });

  if (updated.length === 0) {
    // 余额不足或行不存在
    const balance = await getBalance(args.userId);
    return { ok: false, balance, needed: args.amountCents };
  }

  const balanceAfter = updated[0].balanceCents;

  await db.insert(walletTransactions).values({
    userId: args.userId,
    type: "consume",
    amountCents: -args.amountCents, // 负数表示扣款
    balanceAfterCents: balanceAfter,
    usageLogId: args.usageLogId ?? null,
    description: args.description ?? null,
  });

  return { ok: true, balanceAfterCents: balanceAfter };
}

/**
 * 流水查询 — 倒序最近 limit 条。给 /console/wallet UI 用。
 */
export async function listTransactions(
  userId: string,
  limit = 50,
): Promise<TxnRow[]> {
  const rows = await db
    .select({
      id: walletTransactions.id,
      type: walletTransactions.type,
      amountCents: walletTransactions.amountCents,
      balanceAfterCents: walletTransactions.balanceAfterCents,
      paymentId: walletTransactions.paymentId,
      usageLogId: walletTransactions.usageLogId,
      description: walletTransactions.description,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    type: r.type as TxnType,
  }));
}

/**
 * 当月已消费的累计 cents — UI 显示"本月已花 ¥X.XX"用。
 */
export async function monthlySpend(userId: string): Promise<number> {
  const d = new Date();
  const monthStart = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1),
  );
  const rows = await db
    .select({ amountCents: walletTransactions.amountCents })
    .from(walletTransactions)
    .where(
      sql`${walletTransactions.userId} = ${userId}
          AND ${walletTransactions.type} = 'consume'
          AND ${walletTransactions.createdAt} >= ${monthStart.getTime()}`,
    );
  void gte; // gte not directly used; sql template handles the timestamp compare
  return rows.reduce((s, r) => s + Math.abs(r.amountCents), 0);
}

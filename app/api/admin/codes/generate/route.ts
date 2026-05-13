import crypto from "node:crypto";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, redemptionCodes } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  subject: z.enum(["高数", "线代", "概率论", "其他"]),
  count: z.number().int().min(1).max(200),
  amount_cny: z.number().positive().max(9999),
  notes: z.string().max(120).nullable().optional(),
  expires_in_days: z.number().int().min(1).max(3650).nullable().optional(),
});

// Crockford Base32 (no I/L/O/U) — easy to read, hard to typo.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function makeCode(len = 10): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const caller = session?.user;
  if (!isAdmin(caller)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const expires_at = body.expires_in_days
    ? new Date(Date.now() + body.expires_in_days * 86400 * 1000)
    : null;

  const rows: {
    code: string;
    subject: string;
    amountCny: number;
    notes: string | null;
    expiresAt: Date | null;
  }[] = [];
  const seen = new Set<string>();
  while (rows.length < body.count) {
    const code = makeCode(10);
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({
      code,
      subject: body.subject,
      amountCny: body.amount_cny,
      notes: body.notes ?? null,
      expiresAt: expires_at,
    });
  }

  try {
    const inserted = await db
      .insert(redemptionCodes)
      .values(rows)
      .returning({ code: redemptionCodes.code });
    return NextResponse.json({
      ok: true,
      count: inserted.length,
      codes: inserted.map((r) => r.code),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "insert_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}

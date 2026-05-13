import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "supabase_admin_not_configured" },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
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

  const admin = createSupabaseAdminClient();
  const expires_at = body.expires_in_days
    ? new Date(Date.now() + body.expires_in_days * 86400 * 1000).toISOString()
    : null;

  // Generate `count` codes. If we hit a duplicate on insert, try once more.
  const rows: {
    code: string;
    subject: string;
    amount_cny: number;
    notes: string | null;
    expires_at: string | null;
  }[] = [];
  const seen = new Set<string>();
  while (rows.length < body.count) {
    const code = makeCode(10);
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({
      code,
      subject: body.subject,
      amount_cny: body.amount_cny,
      notes: body.notes ?? null,
      expires_at,
    });
  }

  const { data, error } = await admin
    .from("redemption_codes")
    .insert(rows)
    .select("code");

  if (error) {
    // A unique collision with an existing row is the only realistic failure.
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: data?.length ?? 0,
    codes: (data ?? []).map((r) => r.code),
  });
}

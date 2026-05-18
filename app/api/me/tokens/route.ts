import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db, personalAccessTokens } from "@/lib/db";
import { issueToken } from "@/lib/pat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me/tokens — list the signed-in user's PATs (never the plaintext)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: personalAccessTokens.id,
      name: personalAccessTokens.name,
      prefix: personalAccessTokens.prefix,
      scopes: personalAccessTokens.scopes,
      createdAt: personalAccessTokens.createdAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
      revokedAt: personalAccessTokens.revokedAt,
      expiresAt: personalAccessTokens.expiresAt,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.userId, session.user.id))
    .orderBy(desc(personalAccessTokens.createdAt))
    .limit(50);

  return NextResponse.json({ tokens: rows });
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  // Bearer middleware is intentionally not wired yet (audit doc M1 deferred).
  // We still record the requested scope on the row so that when middleware
  // lands later, existing tokens don't need a backfill.
  scopes: z
    .array(z.enum(["read", "write"]))
    .min(1)
    .max(2)
    .default(["read"]),
  // Days until expiry. Default 90 → matches GitHub's default PAT TTL; null
  // means "never expires" but the UI nudges users toward setting one.
  expiresInDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable()
    .default(90),
});

// POST /api/me/tokens — mint a token. Plaintext is returned ONCE here and
// then never readable again (only sha256 hash is stored).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const issued = issueToken();
  const now = new Date();
  const expiresAt =
    body.expiresInDays != null
      ? new Date(now.getTime() + body.expiresInDays * 86400_000)
      : null;

  try {
    const [row] = await db
      .insert(personalAccessTokens)
      .values({
        userId: session.user.id,
        name: body.name,
        prefix: issued.prefix,
        tokenHash: issued.hash,
        scopes: body.scopes,
        expiresAt,
      })
      .returning({
        id: personalAccessTokens.id,
        name: personalAccessTokens.name,
        prefix: personalAccessTokens.prefix,
        scopes: personalAccessTokens.scopes,
        createdAt: personalAccessTokens.createdAt,
        expiresAt: personalAccessTokens.expiresAt,
      });

    return NextResponse.json({
      token: row,
      // Plaintext — caller MUST stash this; it cannot be retrieved later.
      plaintext: issued.plaintext,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "create_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db, personalAccessTokens } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/me/tokens/[id] — soft-revoke (set revoked_at = now). We don't
// hard-delete because the row carries audit value (when was it created,
// last used, by whom) and because token usage telemetry might already
// reference it once Bearer middleware lands.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // The where clause is the security gate: only revoke a row that belongs
  // to the caller AND is not already revoked (idempotent).
  const result = await db
    .update(personalAccessTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(personalAccessTokens.id, id),
        eq(personalAccessTokens.userId, session.user.id),
        isNull(personalAccessTokens.revokedAt),
      ),
    )
    .returning({ id: personalAccessTokens.id });

  if (result.length === 0) {
    return NextResponse.json(
      { error: "not_found_or_already_revoked" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, id: result[0].id });
}

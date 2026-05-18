import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { assertOfficialEndpoint } from "@/lib/anthropic";
import { auth } from "@/lib/auth";
import { aiChannels, db } from "@/lib/db";

export const runtime = "nodejs";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(60),
  base_url: z.string().url().max(300),
  model: z.string().min(1).max(80),
  priority: z.number().int().min(0).max(9999).default(100),
  enabled: z.boolean().default(true),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user)) {
    return NextResponse.json(
      { error: "forbidden", message: "需要管理员权限" },
      { status: 403 },
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: z.infer<typeof upsertSchema>;
  try {
    body = upsertSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  // Defense in depth — block bad base_url at write time, not just at AI-call
  // time. Without this guard, an admin typo would silently land in the table
  // and only surface as a "host not whitelisted" error inside resolveChannel
  // when a user triggers an AI route.
  try {
    assertOfficialEndpoint(body.base_url);
  } catch (err) {
    return NextResponse.json(
      {
        error: "base_url_not_allowed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  try {
    if (body.id) {
      await db
        .update(aiChannels)
        .set({
          label: body.label,
          baseUrl: body.base_url,
          model: body.model,
          priority: body.priority,
          enabled: body.enabled,
        })
        .where(eq(aiChannels.id, body.id));
      return NextResponse.json({ ok: true, id: body.id });
    }
    const [row] = await db
      .insert(aiChannels)
      .values({
        label: body.label,
        baseUrl: body.base_url,
        model: body.model,
        priority: body.priority,
        enabled: body.enabled,
      })
      .returning({ id: aiChannels.id });
    return NextResponse.json({ ok: true, id: row?.id });
  } catch (err) {
    return NextResponse.json(
      {
        error: "upsert_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: z.infer<typeof deleteSchema>;
  try {
    body = deleteSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    await db.delete(aiChannels).where(eq(aiChannels.id, body.id));
  } catch (err) {
    return NextResponse.json(
      {
        error: "delete_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

// Quick health-check: PUT /api/admin/channels with { id, action: "ping" }
// hits the channel's base_url with a 5s timeout. Stamps last_ok_at on success.
const pingSchema = z.object({
  id: z.string().uuid(),
  action: z.literal("ping"),
});

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: z.infer<typeof pingSchema>;
  try {
    body = pingSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const [channel] = await db
    .select()
    .from(aiChannels)
    .where(eq(aiChannels.id, body.id))
    .limit(1);
  if (!channel) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404 },
    );
  }

  // Lightweight ping — just a HEAD on the base URL with 5s timeout.
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  let ok = false;
  let err: string | null = null;
  try {
    const res = await fetch(channel.baseUrl, {
      method: "HEAD",
      signal: controller.signal,
    });
    ok = res.status < 500; // 200/301/401 etc. count as "reachable"
    if (!ok) err = `HTTP ${res.status}`;
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(t);
  }

  await db
    .update(aiChannels)
    .set({
      lastOkAt: ok ? new Date() : channel.lastOkAt,
      lastError: ok ? null : err,
    })
    .where(eq(aiChannels.id, body.id));

  return NextResponse.json({ ok, error: err });
}

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { db, systemSettings } from "@/lib/db";
import { readAllSettings } from "@/lib/system-settings";

export const runtime = "nodejs";

const upsertSchema = z.object({
  key: z.enum(["pricing", "free_tier_quota", "maintenance", "announcement"]),
  value_json: z.unknown(),
});

export async function GET() {
  const settings = await readAllSettings();
  return NextResponse.json({ settings });
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

  let body: z.infer<typeof upsertSchema>;
  try {
    body = upsertSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    await db
      .insert(systemSettings)
      .values({
        key: body.key,
        valueJson: body.value_json as unknown as never,
        updatedAt: new Date(),
        updatedBy: caller!.id,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          valueJson: body.value_json as unknown as never,
          updatedAt: new Date(),
          updatedBy: caller!.id,
        },
      });
  } catch (err) {
    return NextResponse.json(
      {
        error: "upsert_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, key: body.key });
}

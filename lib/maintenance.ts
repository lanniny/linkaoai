import "server-only";

import { NextResponse } from "next/server";

import { readSetting } from "@/lib/system-settings";

/**
 * Returns a 503 NextResponse iff system_settings.maintenance.enabled = true,
 * otherwise returns null. Use at the top of any /api/* handler that should
 * pause during maintenance:
 *
 *   const m = await assertNotMaintenance();
 *   if (m) return m;
 *
 * Admin API routes intentionally do NOT call this — the founder needs to
 * keep editing settings even during maintenance.
 */
export async function assertNotMaintenance(): Promise<NextResponse | null> {
  try {
    const m = await readSetting("maintenance");
    if (m.enabled) {
      return NextResponse.json(
        {
          error: "maintenance",
          message: m.message || "服务正在维护中，请稍后再试",
        },
        { status: 503, headers: { "Retry-After": "300" } },
      );
    }
  } catch {
    // If we can't read the setting we'd rather over-serve than over-block.
  }
  return null;
}

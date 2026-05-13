import "server-only";

import { db, systemSettings } from "@/lib/db";

/**
 * M8 mirror · admin-tunable runtime config stored in public.system_settings.
 *
 * Provides typed read access with hard-coded defaults so the rest of the app
 * keeps working even before the DB has a row yet.
 *
 * Writes happen exclusively through /api/admin/settings (admin-guarded).
 */

export type Pricing = Record<string, number>;
export type FreeTierQuota = {
  extract: number;
  generate_questions: number;
  grade: number;
  sprint_plan: number;
};
export type Maintenance = { enabled: boolean; message: string };
export type Announcement = {
  enabled: boolean;
  text: string;
  href: string | null;
};

const DEFAULTS = {
  pricing: { 高数: 19.9, 线代: 19.9, 概率论: 19.9, 其他: 19.9 } as Pricing,
  free_tier_quota: {
    extract: 1,
    generate_questions: 20,
    grade: 60,
    sprint_plan: 3,
  } as FreeTierQuota,
  maintenance: { enabled: false, message: "" } as Maintenance,
  announcement: { enabled: false, text: "", href: null } as Announcement,
};

export type SettingKey = keyof typeof DEFAULTS;

export async function readSetting<K extends SettingKey>(
  key: K,
): Promise<(typeof DEFAULTS)[K]> {
  try {
    const rows = await db
      .select({ value: systemSettings.valueJson })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    const v = rows[0]?.value;
    if (!v) return DEFAULTS[key];
    return v as (typeof DEFAULTS)[K];
  } catch {
    return DEFAULTS[key];
  }
}

export async function readAllSettings(): Promise<typeof DEFAULTS> {
  try {
    const rows = await db
      .select({ key: systemSettings.key, value: systemSettings.valueJson })
      .from(systemSettings);
    const merged = { ...DEFAULTS };
    for (const row of rows) {
      const k = row.key as SettingKey;
      if (k in merged) {
        (merged as Record<string, unknown>)[k] = row.value;
      }
    }
    return merged;
  } catch {
    return DEFAULTS;
  }
}

export { DEFAULTS as SYSTEM_SETTINGS_DEFAULTS };

// drizzle helper import — lazy to avoid `eq` being seen as unused above.
import { eq } from "drizzle-orm";

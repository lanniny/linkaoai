import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

/**
 * M8 mirror · admin-tunable runtime config stored in public.system_settings.
 *
 * Provides typed read access with hard-coded defaults so the rest of the app
 * keeps working even before the row exists (or before 0004 migration ran).
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
  if (!isSupabaseAdminConfigured()) return DEFAULTS[key];
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("value_json")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return DEFAULTS[key];
    return data.value_json as (typeof DEFAULTS)[K];
  } catch {
    return DEFAULTS[key];
  }
}

export async function readAllSettings(): Promise<typeof DEFAULTS> {
  if (!isSupabaseAdminConfigured()) return DEFAULTS;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("system_settings")
      .select("key, value_json");
    const merged = { ...DEFAULTS };
    for (const row of data ?? []) {
      const k = row.key as SettingKey;
      if (k in merged) {
        (merged as Record<string, unknown>)[k] = row.value_json;
      }
    }
    return merged;
  } catch {
    return DEFAULTS;
  }
}

export { DEFAULTS as SYSTEM_SETTINGS_DEFAULTS };

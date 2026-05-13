"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type {
  Announcement,
  FreeTierQuota,
  Maintenance,
  Pricing,
} from "@/lib/system-settings";

type Settings = {
  pricing: Pricing;
  free_tier_quota: FreeTierQuota;
  maintenance: Maintenance;
  announcement: Announcement;
};

const SUBJECTS = ["高数", "线代", "概率论", "其他"] as const;

const QUOTA_LABELS: Record<keyof FreeTierQuota, string> = {
  extract: "PDF 提取大纲",
  generate_questions: "AI 出题",
  grade: "批改",
  sprint_plan: "冲刺计划",
};

export function SystemSettingsForm({ initial }: { initial: Settings }) {
  const [pricing, setPricing] = useState<Pricing>(initial.pricing);
  const [quota, setQuota] = useState<FreeTierQuota>(initial.free_tier_quota);
  const [maintenance, setMaintenance] = useState<Maintenance>(
    initial.maintenance,
  );
  const [announcement, setAnnouncement] = useState<Announcement>(
    initial.announcement,
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function save(
    key: "pricing" | "free_tier_quota" | "maintenance" | "announcement",
    value: unknown,
  ) {
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value_json: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      toast.success(`${key} 已保存`);
    } catch (err) {
      toast.error("保存失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setSavingKey(null);
    }
  }

  function renderSaveBtn(k: "pricing" | "free_tier_quota" | "maintenance" | "announcement") {
    const loading = savingKey === k;
    const value =
      k === "pricing"
        ? pricing
        : k === "free_tier_quota"
          ? quota
          : k === "maintenance"
            ? maintenance
            : announcement;
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => save(k, value)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Save className="h-3 w-3" />
        )}
        保存
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pricing */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">💰 定价（CNY / 单科）</h3>
          {renderSaveBtn("pricing")}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUBJECTS.map((s) => (
            <div key={s}>
              <label className="block text-xs font-medium text-zinc-600">
                {s}
              </label>
              <input
                type="number"
                step={0.1}
                min={0}
                value={pricing[s] ?? 19.9}
                onChange={(e) =>
                  setPricing({ ...pricing, [s]: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Free tier quota */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">🆓 免费配额（每用户每月）</h3>
          {renderSaveBtn("free_tier_quota")}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(QUOTA_LABELS) as (keyof FreeTierQuota)[]).map((k) => (
            <div key={k}>
              <label className="block text-xs font-medium text-zinc-600">
                {QUOTA_LABELS[k]}
              </label>
              <input
                type="number"
                min={0}
                value={quota[k]}
                onChange={(e) =>
                  setQuota({ ...quota, [k]: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          设为 0 表示禁止免费用户调用 · 已付费用户不受配额限制
        </p>
      </section>

      {/* Maintenance */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">🔧 维护模式</h3>
          {renderSaveBtn("maintenance")}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={maintenance.enabled}
            onChange={(e) =>
              setMaintenance({ ...maintenance, enabled: e.target.checked })
            }
            className="h-4 w-4 accent-red-600"
          />
          <span className={maintenance.enabled ? "font-semibold text-red-700" : ""}>
            启用维护模式（/api/* 返回 503，仅 /api/admin/* 例外）
          </span>
        </label>
        <textarea
          value={maintenance.message}
          onChange={(e) =>
            setMaintenance({ ...maintenance, message: e.target.value })
          }
          placeholder="维护说明，将显示给用户。例如：今晚 23:00 服务器升级 30 分钟。"
          rows={2}
          maxLength={200}
          className="mt-2 w-full rounded border border-zinc-300 bg-white p-2 text-sm"
        />
      </section>

      {/* Announcement */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">📢 首页公告横幅</h3>
          {renderSaveBtn("announcement")}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={announcement.enabled}
            onChange={(e) =>
              setAnnouncement({ ...announcement, enabled: e.target.checked })
            }
            className="h-4 w-4 accent-amber-600"
          />
          启用公告（显示在营销首页顶部）
        </label>
        <input
          type="text"
          value={announcement.text}
          onChange={(e) =>
            setAnnouncement({ ...announcement, text: e.target.value })
          }
          placeholder="公告文案。例如：📣 5/15 起线代讲义已更新，记得重新提取大纲~"
          maxLength={160}
          className="mt-2 w-full rounded border border-zinc-300 bg-white p-2 text-sm"
        />
        <input
          type="url"
          value={announcement.href ?? ""}
          onChange={(e) =>
            setAnnouncement({
              ...announcement,
              href: e.target.value.trim() || null,
            })
          }
          placeholder="可选链接 https://... 留空则不跳转"
          className="mt-2 w-full rounded border border-zinc-300 bg-white p-2 text-sm"
        />
      </section>
    </div>
  );
}

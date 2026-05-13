import { Settings2 } from "lucide-react";

import { readAllSettings } from "@/lib/system-settings";
import { SystemSettingsForm } from "./SystemSettingsForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await readAllSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Settings2 className="h-4 w-4" />
          系统设置
        </h2>
        <p className="text-xs text-zinc-500">
          运行时可调参数 · 4 组：定价 · 免费配额 · 维护开关 · 公告横幅
        </p>
      </header>

      <SystemSettingsForm initial={settings} />

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <p className="font-semibold">⚠️ 改动立即生效</p>
        <ul className="mt-1 space-y-0.5">
          <li>
            • <strong>定价</strong>：影响 /console/billing 与下单接口
          </li>
          <li>
            • <strong>免费配额</strong>：每用户每月 AI 调用上限（M2 module 配合落库）
          </li>
          <li>
            • <strong>维护开关</strong>：开启后 /api/* 返回 503（admin API 不受影响）
          </li>
          <li>
            • <strong>公告</strong>：营销首页顶部横幅文案
          </li>
        </ul>
      </section>
    </div>
  );
}

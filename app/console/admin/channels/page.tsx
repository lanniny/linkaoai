import { asc } from "drizzle-orm";
import { Cable } from "lucide-react";

import { aiChannels, db } from "@/lib/db";
import { ChannelsTable } from "./ChannelsTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminChannelsPage() {
  const channels = await db
    .select()
    .from(aiChannels)
    .orderBy(asc(aiChannels.priority));

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Cable className="h-4 w-4" />
          AI 渠道路由（{channels.length}）
        </h2>
        <p className="text-xs text-zinc-500">
          按 priority 升序选用 · 关闭/启用立刻生效 · ping 检查更新 last_ok_at
        </p>
      </header>

      <ChannelsTable
        initial={channels.map((c) => ({
          id: c.id,
          label: c.label,
          baseUrl: c.baseUrl,
          model: c.model,
          priority: c.priority,
          enabled: c.enabled,
          lastOkAt: c.lastOkAt ? new Date(c.lastOkAt).toISOString() : null,
          lastError: c.lastError ?? null,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
        }))}
      />
    </div>
  );
}

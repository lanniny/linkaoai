"use client";

import { Activity, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export interface ChannelRow {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  priority: number;
  enabled: boolean;
  lastOkAt: string | null;
  lastError: string | null;
  createdAt: string | null;
}

function fmtRelative(s: string | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return s;
  }
}

export function ChannelsTable({ initial }: { initial: ChannelRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ChannelRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<{
    label: string;
    baseUrl: string;
    model: string;
    priority: number;
  }>({
    label: "",
    baseUrl: "",
    model: "",
    priority: 100,
  });
  const [creating, setCreating] = useState(false);

  function patchLocal(id: string, patch: Partial<ChannelRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: ChannelRow) {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          label: row.label,
          base_url: row.baseUrl,
          model: row.model,
          priority: row.priority,
          enabled: row.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      toast.success("已保存");
    } catch (err) {
      toast.error("保存失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRow(id: string) {
    if (!confirm("确认删除这个渠道？正在使用的请求会立即报错")) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setRows((rs) => rs.filter((r) => r.id !== id));
      toast.success("已删除");
      router.refresh();
    } catch (err) {
      toast.error("删除失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function pingRow(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: "ping" }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("ping OK");
        patchLocal(id, {
          lastOkAt: new Date().toISOString(),
          lastError: null,
        });
      } else {
        toast.error("ping 失败", { description: data.error });
        patchLocal(id, { lastError: data.error });
      }
    } catch (err) {
      toast.error("ping 异常", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function createNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newRow.label || !newRow.baseUrl || !newRow.model) {
      toast.error("label / base_url / model 都必填");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: newRow.label,
          base_url: newRow.baseUrl,
          model: newRow.model,
          priority: newRow.priority,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      toast.success("已新增渠道");
      setNewRow({ label: "", baseUrl: "", model: "", priority: 100 });
      router.refresh();
    } catch (err) {
      toast.error("新增失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">label</th>
              <th className="px-3 py-2 text-left font-medium">base_url</th>
              <th className="px-3 py-2 text-left font-medium">model</th>
              <th className="px-3 py-2 text-left font-medium">priority</th>
              <th className="px-3 py-2 text-left font-medium">enabled</th>
              <th className="px-3 py-2 text-left font-medium">last ok</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-50/60">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.label}
                    onChange={(e) => patchLocal(r.id, { label: e.target.value })}
                    className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="url"
                    value={r.baseUrl}
                    onChange={(e) =>
                      patchLocal(r.id, { baseUrl: e.target.value })
                    }
                    className="w-full rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-[11px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.model}
                    onChange={(e) => patchLocal(r.id, { model: e.target.value })}
                    className="w-full rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-[11px]"
                  />
                </td>
                <td className="px-3 py-2 w-20">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={r.priority}
                    onChange={(e) =>
                      patchLocal(r.id, {
                        priority: Number(e.target.value) || 0,
                      })
                    }
                    className="w-16 rounded border border-zinc-200 bg-white px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) =>
                      patchLocal(r.id, { enabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />
                </td>
                <td className="px-3 py-2 text-[10px] text-zinc-500">
                  {r.lastOkAt ? (
                    <span className="text-emerald-700">
                      ✓ {fmtRelative(r.lastOkAt)}
                    </span>
                  ) : r.lastError ? (
                    <span className="text-red-600" title={r.lastError}>
                      ✗ {r.lastError.slice(0, 30)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => pingRow(r.id)}
                      className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <Activity className="h-3 w-3" />
                      ping
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => saveRow(r)}
                      className="inline-flex items-center gap-1 rounded border border-zinc-900 bg-zinc-900 px-2 py-1 text-[11px] text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      保存
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => deleteRow(r.id)}
                      className="inline-flex items-center gap-1 rounded border border-red-300 bg-white px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-xs text-zinc-500"
                >
                  暂无渠道
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <form
        onSubmit={createNew}
        className="grid grid-cols-2 gap-2 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:grid-cols-5"
      >
        <input
          type="text"
          required
          placeholder="label · e.g. Sonnet primary"
          value={newRow.label}
          onChange={(e) => setNewRow({ ...newRow, label: e.target.value })}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
        />
        <input
          type="url"
          required
          placeholder="base_url · https://..."
          value={newRow.baseUrl}
          onChange={(e) => setNewRow({ ...newRow, baseUrl: e.target.value })}
          className="rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-[11px]"
        />
        <input
          type="text"
          required
          placeholder="model · claude-..."
          value={newRow.model}
          onChange={(e) => setNewRow({ ...newRow, model: e.target.value })}
          className="rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-[11px]"
        />
        <input
          type="number"
          min={0}
          max={9999}
          value={newRow.priority}
          onChange={(e) =>
            setNewRow({ ...newRow, priority: Number(e.target.value) || 100 })
          }
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center justify-center gap-1.5 rounded border border-amber-700 bg-amber-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          新增
        </button>
      </form>
    </div>
  );
}

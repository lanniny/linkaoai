"use client";

import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Mirrors lib/db/schema.ts personalAccessTokens row (timestamps serialized
// to ms-since-epoch numbers via JSON; null when never used / not expiring).
type TokenRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: ("read" | "write")[];
  createdAt: number | string;
  lastUsedAt: number | string | null;
  revokedAt: number | string | null;
  expiresAt: number | string | null;
};

function fmtDate(s: number | string | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(s);
  }
}

function tokenStatus(t: TokenRow): {
  label: string;
  tone: string;
} {
  if (t.revokedAt) return { label: "已撤销", tone: "bg-zinc-200 text-zinc-600" };
  if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
    return { label: "已过期", tone: "bg-amber-100 text-amber-800" };
  }
  return { label: "有效", tone: "bg-emerald-100 text-emerald-800" };
}

export function PatManager({ initial }: { initial: TokenRow[] }) {
  const [tokens, setTokens] = useState<TokenRow[]>(initial);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "write">("read");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(90);
  const [creating, setCreating] = useState(false);
  // The one-time plaintext display — shown right after creation, then user
  // must copy it before dismissing. We never re-fetch this from the server.
  const [justIssued, setJustIssued] = useState<{
    plaintext: string;
    name: string;
  } | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("请填写 token 名称");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/me/tokens", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          name: name.trim(),
          scopes: [scope],
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("创建失败", { description: data.message ?? data.error });
        return;
      }
      const created = data.token as TokenRow;
      setTokens((prev) => [created, ...prev]);
      setJustIssued({ plaintext: data.plaintext as string, name: created.name });
      setName("");
      toast.success("Token 创建成功");
    } catch (err) {
      toast.error("创建失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string, label: string) {
    if (!confirm(`确认撤销 token「${label}」？撤销后不可恢复。`)) return;
    try {
      const res = await fetch(`/api/me/tokens/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error("撤销失败", { description: data.message ?? data.error });
        return;
      }
      setTokens((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, revokedAt: Date.now() } : t,
        ),
      );
      toast.success(`已撤销 ${label}`);
    } catch (err) {
      toast.error("撤销失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  }

  function copyToken(s: string) {
    navigator.clipboard
      .writeText(s)
      .then(() => toast.success("已复制到剪贴板"))
      .catch(() => toast.error("剪贴板访问被拒绝"));
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-zinc-500" />
          个人访问令牌（{tokens.filter((t) => !t.revokedAt).length} 有效 /{" "}
          {tokens.length} 总）
        </h2>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        new-api M1 镜像 · token 仅在创建时显示一次，请妥善保管。当前 Bearer
        验证未启用，token 可创建但暂时不能调用 API；schema + UI 已就绪等启用。
      </p>

      {justIssued && (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-emerald-900">
              ✓ 新 token：{justIssued.name}
            </span>
            <button
              type="button"
              onClick={() => setJustIssued(null)}
              className="text-[11px] text-emerald-700 underline-offset-2 hover:underline"
            >
              我已保存，关闭
            </button>
          </div>
          <p className="mt-1 text-[11px] text-emerald-800">
            ⚠️ 关闭后无法再次查看，请立刻复制到密码管理器
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-xs">
              {justIssued.plaintext}
            </code>
            <button
              type="button"
              onClick={() => copyToken(justIssued.plaintext)}
              className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-800"
            >
              <Copy className="h-3 w-3" />
              复制
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
              maxLength={60}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
              placeholder="例：CLI 本地"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              权限
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "read" | "write")}
              disabled={creating}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            >
              <option value="read">只读</option>
              <option value="write">读写</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              过期（天）
            </label>
            <select
              value={expiresInDays ?? "never"}
              onChange={(e) =>
                setExpiresInDays(
                  e.target.value === "never" ? null : Number(e.target.value),
                )
              }
              disabled={creating}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            >
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="90">90 天</option>
              <option value="365">1 年</option>
              <option value="never">永不</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          {creating ? "创建中…" : "创建 Token"}
        </button>
      </form>

      <div className="mt-4 border-t border-zinc-100 pt-3">
        {tokens.length === 0 ? (
          <p className="text-[11px] text-zinc-400">还没有 token</p>
        ) : (
          <ul className="space-y-1.5">
            {tokens.map((t) => {
              const status = tokenStatus(t);
              return (
                <li
                  key={t.id}
                  className="flex items-baseline gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-zinc-800">{t.name}</span>
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                    {t.prefix}…
                  </code>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${status.tone}`}>
                    {status.label}
                  </span>
                  <span className="hidden text-[10px] text-zinc-400 sm:inline">
                    {t.scopes.join("/")} · 创建 {fmtDate(t.createdAt)} · 过期{" "}
                    {fmtDate(t.expiresAt)}
                  </span>
                  <span className="ml-auto">
                    {!t.revokedAt && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(t.id, t.name)}
                        className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-0.5 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        撤销
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

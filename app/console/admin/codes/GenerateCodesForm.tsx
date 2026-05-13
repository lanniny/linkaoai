"use client";

import { Copy, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const SUBJECTS = ["高数", "线代", "概率论", "其他"];

export function GenerateCodesForm() {
  const [subject, setSubject] = useState("高数");
  const [count, setCount] = useState(10);
  const [amountCny, setAmountCny] = useState(19.9);
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [lastBatch, setLastBatch] = useState<string[] | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (count < 1 || count > 200) {
      toast.error("数量必须在 1-200 之间");
      return;
    }
    setLoading(true);
    setLastBatch(null);
    try {
      const res = await fetch("/api/admin/codes/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject,
          count,
          amount_cny: amountCny,
          notes: notes.trim() || null,
          expires_in_days: expiresInDays === "" ? null : Number(expiresInDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      const codes = (data.codes ?? []) as string[];
      setLastBatch(codes);
      toast.success(`已生成 ${codes.length} 个兑换码`);
      router.refresh();
    } catch (err) {
      toast.error("生成失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!lastBatch || lastBatch.length === 0) return;
    try {
      await navigator.clipboard.writeText(lastBatch.join("\n"));
      toast.success(`已复制 ${lastBatch.length} 个码到剪贴板`);
    } catch {
      toast.error("复制失败 · 请手动选中");
    }
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <Sparkles className="h-4 w-4" />
        批量生成兑换码
      </h3>
      <form
        onSubmit={handleSubmit}
        className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        <div>
          <label className="block text-xs font-medium text-zinc-600">学科</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">数量</label>
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
            }
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            面值 (¥)
          </label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={amountCny}
            onChange={(e) => setAmountCny(Number(e.target.value) || 19.9)}
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            过期（天，可空）
          </label>
          <input
            type="number"
            min={1}
            value={expiresInDays}
            placeholder="永久"
            onChange={(e) =>
              setExpiresInDays(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">备注</label>
          <input
            type="text"
            value={notes}
            placeholder="小红书 0513"
            onChange={(e) => setNotes(e.target.value)}
            maxLength={60}
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
          />
        </div>
        <div className="col-span-2 sm:col-span-5">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "生成中…" : `生成 ${count} 个兑换码`}
          </button>
        </div>
      </form>

      {lastBatch && lastBatch.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-700">
              ✓ 刚生成的 {lastBatch.length} 个码（请立刻复制保存）：
            </p>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] hover:bg-zinc-50"
            >
              <Copy className="h-3 w-3" />
              一键复制
            </button>
          </div>
          <textarea
            readOnly
            value={lastBatch.join("\n")}
            rows={Math.min(10, lastBatch.length)}
            className="w-full rounded-lg border border-zinc-300 bg-white p-2 font-mono text-xs"
          />
        </div>
      )}
    </section>
  );
}

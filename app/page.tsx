"use client";

import { useState } from "react";
import type { Outline, Subject } from "@/lib/types";

const SUBJECTS: Subject[] = ["高数", "线代", "概率论"];

const LEVEL_STYLES: Record<string, string> = {
  必考: "bg-red-100 text-red-700 border-red-200",
  重点: "bg-amber-100 text-amber-700 border-amber-200",
  了解: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<Subject>("高数");
  const [outline, setOutline] = useState<Outline | null>(null);
  const [meta, setMeta] = useState<{ model: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("请先选择 PDF 课件");
      return;
    }
    setLoading(true);
    setError(null);
    setOutline(null);
    setMeta(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subject", subject);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      setOutline(data.outline as Outline);
      setMeta({ model: data.meta?.model ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">临考</h1>
        <p className="mt-1 text-zinc-600">
          AI 期末冲刺 · 高数 / 线代 / 概率论
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          AI 生成内容仅供参考，请以教材 / 老师讲义为准
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="subject">
            学科
          </label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="file">
            课件 PDF（≤ 30 MB）
          </label>
          <input
            id="file"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1"
          />
          {file && (
            <p className="text-xs text-zinc-500">
              已选：{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full rounded bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "提取中…（约 30-60 秒）" : "提取考点大纲"}
        </button>
        {error && <p className="text-sm text-red-600">⚠️ {error}</p>}
      </form>

      {outline && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">{outline.source_title}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              学科：{outline.subject}
              {meta?.model && (
                <span className="ml-3 rounded bg-zinc-100 px-2 py-0.5 text-xs">
                  by {meta.model}
                </span>
              )}
            </p>
          </div>
          {outline.notes && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              📌 {outline.notes}
            </div>
          )}
          <ul className="space-y-3">
            {outline.topics.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-medium">{t.title}</h3>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-xs ${
                      LEVEL_STYLES[t.level] ?? ""
                    }`}
                  >
                    {t.level}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">{t.explanation}</p>
                {t.estimated_minutes && (
                  <p className="mt-1 text-xs text-zinc-400">
                    预计 {t.estimated_minutes} 分钟
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t pt-6 text-center text-xs text-zinc-400">
        临考 · linkaoai.com
      </footer>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  // Client-readable check — NEXT_PUBLIC_* env is inlined at build, so this
  // reflects whether the founder has configured Supabase yet.
  const supabaseConfigured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) {
      setError(
        "登录功能尚未开通（Supabase 项目还在配置中，预计 Day 8 上线）。可继续使用首页提取大纲 / 出题 / 批改 / 冲刺计划。",
      );
      return;
    }
    if (!email.includes("@")) {
      setError("请输入有效邮箱");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signInError) throw signInError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-xs text-zinc-500 transition hover:underline"
        >
          ← 返回首页
        </Link>
        <h1 className="text-3xl font-bold">登录 / 注册</h1>
        <p className="text-sm text-zinc-600">
          输入邮箱，我们会发一封一键登录链接到你邮箱。
          没账号会自动注册，不需要密码。
        </p>
      </header>

      {!supabaseConfigured && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          ⚠️ 登录尚未开通（MVP Day 7 部署时 Supabase 项目仍在准备）。
          可以先回首页直接用，<strong>历史记录会在登录上线后自动同步</strong>。
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="email">
            邮箱
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading || sent}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm disabled:bg-zinc-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || sent}
          className="w-full rounded bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sent
            ? "✓ 已发送，请去邮箱查收"
            : loading
              ? "发送中…"
              : "发送登录链接"}
        </button>
        {error && <p className="text-sm text-red-600">⚠️ {error}</p>}
        {sent && (
          <p className="rounded bg-emerald-50 p-3 text-xs text-emerald-900">
            ✓ 已发送到 <strong>{email}</strong>，请去邮箱点击链接完成登录。
            收件箱没看到的话查一下 <strong>垃圾邮件</strong> 或 <strong>促销</strong> 分类。
          </p>
        )}
      </form>

      <footer className="text-center text-xs text-zinc-400">
        临考 · linkaoai.com
      </footer>
    </main>
  );
}

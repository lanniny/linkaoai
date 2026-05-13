"use client";

import {
  ArrowRight,
  AtSign,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginMode = "password" | "magic_link";

export default function LoginPage() {
  const supabaseConfigured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // Surface ?error= from /auth/callback redirects
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const err = p.get("error");
    if (err === "auth_failed") {
      toast.error("登录失败", { description: "链接已过期或无效，请重发" });
    } else if (err === "supabase_not_configured") {
      toast.error("登录功能尚未开通", {
        description: "Supabase 项目还未配置（待主人填入 .env）",
      });
    }
    if (err) {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("登录功能尚未开通", {
        description: "Supabase 项目尚未配置",
      });
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("登录成功");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next ?? "/console";
    } catch (err) {
      toast.error("登录失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("登录功能尚未开通");
      return;
    }
    if (!email.includes("@")) {
      toast.error("请输入有效邮箱");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const next = new URLSearchParams(window.location.search).get("next");
      const redirectTo = next
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMagicSent(true);
      toast.success("登录链接已发送", { description: email });
    } catch (err) {
      toast.error("发送失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 via-white to-amber-50/30 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold tracking-tight">临考</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            {mode === "password" ? "登录账号" : "邮件一键登录"}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {mode === "password"
              ? "邮箱 + 密码 · 没账号点下方注册"
              : "输入邮箱，发送一次性登录链接到邮箱"}
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="font-semibold">⚠️ Demo 模式 · 登录暂未生效</div>
            <p className="mt-1 leading-relaxed">
              Supabase 项目还没配置完。试用流程（PDF→大纲→出题→批改→冲刺计划）在
              <Link href="/" className="mx-1 underline">
                首页
              </Link>
              均可直接使用，登录只影响历史记录持久化。
            </p>
          </div>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          {/* Tabs */}
          <div className="mb-5 inline-flex w-full rounded-lg border bg-zinc-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition ${
                mode === "password"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              邮箱密码
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("magic_link");
                setMagicSent(false);
              }}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition ${
                mode === "magic_link"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              邮件链接（免密）
            </button>
          </div>

          {mode === "password" ? (
            <form onSubmit={handlePassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  邮箱
                </label>
                <div className="flex items-center rounded-lg border border-zinc-300 bg-white transition focus-within:border-zinc-900">
                  <AtSign className="ml-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    autoComplete="email"
                    className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  密码
                </label>
                <div className="flex items-center rounded-lg border border-zinc-300 bg-white transition focus-within:border-zinc-900">
                  <Lock className="ml-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    placeholder="至少 6 位"
                    disabled={loading}
                    autoComplete="current-password"
                    className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !supabaseConfigured}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "登录中…" : "登录"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
              <p className="pt-2 text-center text-xs text-zinc-500">
                没账号？
                <Link
                  href="/register"
                  className="ml-1 font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  注册新账号
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  邮箱
                </label>
                <div className="flex items-center rounded-lg border border-zinc-300 bg-white transition focus-within:border-zinc-900">
                  <Mail className="ml-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading || magicSent}
                    autoComplete="email"
                    className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || magicSent || !supabaseConfigured}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {magicSent
                  ? "✓ 已发送，请去邮箱"
                  : loading
                    ? "发送中…"
                    : "发送登录链接"}
              </button>
              {magicSent && (
                <p className="rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
                  ✓ 已发送到 <strong>{email}</strong>。
                  请去邮箱点击链接完成登录，
                  若没收到查看 <strong>垃圾邮件</strong>。
                </p>
              )}
              <p className="pt-2 text-center text-xs text-zinc-500">
                首次登录会自动创建账号 ·{" "}
                <Link
                  href="/register"
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  也可手动注册
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs leading-relaxed text-zinc-400">
          登录即同意 AI 输出仅供参考、以教材老师讲义为准 ·{" "}
          <Link href="/pay" className="underline">
            退款条款
          </Link>
        </p>
      </div>
    </main>
  );
}

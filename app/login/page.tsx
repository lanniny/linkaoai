"use client";

import {
  ArrowRight,
  AtSign,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Surface ?error= from earlier redirects
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const err = p.get("error");
    if (err === "auth_failed") {
      toast.error("登录失败", { description: "请检查邮箱密码" });
    } else if (err === "admin_required") {
      toast.error("需要管理员权限");
    }
    if (err) {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) throw new Error(error.message ?? "登录失败");
      if (!data) throw new Error("登录失败：服务器未返回 session");
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
          <h1 className="mt-6 text-2xl font-bold tracking-tight">登录账号</h1>
          <p className="mt-1 text-xs text-zinc-500">
            邮箱 + 密码 · 没账号点下方注册
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-3">
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
              disabled={loading}
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
        </div>

        <p className="text-center text-xs leading-relaxed text-zinc-400">
          登录即同意 AI 输出仅供参考、以教材老师讲义为准 ·{" "}
          <Link href="/console/billing" className="underline">
            退款条款
          </Link>
        </p>
      </div>
    </main>
  );
}

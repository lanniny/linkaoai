"use client";

import {
  ArrowRight,
  AtSign,
  Check,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const supabaseConfigured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("注册功能尚未开通", {
        description: "Supabase 项目尚未配置",
      });
      return;
    }
    if (!email.includes("@")) {
      toast.error("请输入有效邮箱");
      return;
    }
    if (password.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    if (password !== passwordRepeat) {
      toast.error("两次密码不一致");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setDone(true);
      // If Supabase has email confirmation OFF, user gets a session right away.
      if (data.session) {
        toast.success("注册成功，已登录");
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } else {
        toast.success("注册成功", {
          description: "请去邮箱点击确认链接激活账号",
        });
      }
    } catch (err) {
      toast.error("注册失败", {
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
          <h1 className="mt-6 text-2xl font-bold tracking-tight">注册新账号</h1>
          <p className="mt-1 text-xs text-zinc-500">
            邮箱 + 密码 · 注册即可同步学习历史与解锁付费功能
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="font-semibold">⚠️ Demo 模式 · 注册暂未生效</div>
            <p className="mt-1">主人配好 .env 后此页自动激活。</p>
          </div>
        )}

        {!done && (
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
                    autoComplete="new-password"
                    className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  再输入一次
                </label>
                <div className="flex items-center rounded-lg border border-zinc-300 bg-white transition focus-within:border-zinc-900">
                  <Lock className="ml-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={passwordRepeat}
                    onChange={(e) => setPasswordRepeat(e.target.value)}
                    minLength={6}
                    placeholder="再输入一次"
                    disabled={loading}
                    autoComplete="new-password"
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
                {loading ? "注册中…" : "创建账号"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
              <p className="pt-2 text-center text-xs text-zinc-500">
                已有账号？
                <Link
                  href="/login"
                  className="ml-1 font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  去登录
                </Link>
              </p>
            </form>
          </div>
        )}

        {done && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-sm">
            <Check className="mx-auto h-10 w-10 rounded-full bg-emerald-100 p-2 text-emerald-700" />
            <h2 className="mt-3 text-base font-semibold text-emerald-900">
              注册请求已提交
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-emerald-800">
              如果 Supabase 启用了邮箱确认，请去 <strong>{email}</strong>{" "}
              点击确认链接完成激活；
              没启用则已自动登录，3 秒后回到首页。
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              立即去首页
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        <p className="text-center text-xs leading-relaxed text-zinc-400">
          注册即同意 AI 输出仅供参考、以教材老师讲义为准 ·{" "}
          <Link href="/pay" className="underline">
            退款条款
          </Link>
        </p>
      </div>
    </main>
  );
}

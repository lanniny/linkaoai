import { ArrowRight, LayoutDashboard, LogIn, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";

import { headers } from "next/headers";

import FeaturesGrid from "@/app/components/marketing/FeaturesGrid";
import Footer from "@/app/components/marketing/Footer";
import Hero from "@/app/components/marketing/Hero";
import PricingCard from "@/app/components/marketing/PricingCard";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

async function getViewerUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const user = await getViewerUser();

  return (
    <>
      {/* Sticky marketing header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight">临考</span>
            <span className="ml-1 hidden text-[10px] font-medium text-amber-700 sm:inline">
              v0.1
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-xs text-zinc-600 sm:flex">
            <a href="#features" className="transition hover:text-zinc-900">
              功能
            </a>
            <a href="#pricing" className="transition hover:text-zinc-900">
              定价
            </a>
            <Link
              href="/console/billing"
              className="transition hover:text-zinc-900"
            >
              退款条款
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-xs">
            {user ? (
              <Link
                href="/console"
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 font-medium text-white shadow-sm transition hover:bg-zinc-800"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                进入控制台
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  登录
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 font-medium text-white shadow-sm transition hover:bg-zinc-800"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Hero />
      <div id="features">
        <FeaturesGrid />
      </div>
      <div id="pricing">
        <PricingCard />
      </div>

      {/* Closing CTA strip */}
      <section className="border-y border-zinc-200 bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            7 天后考试，要不要先<span className="text-amber-700">试一下</span>？
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            注册 30 秒，免费上传 1 份 PDF 提取大纲。觉得不亏再 19.9 元解锁单科。
          </p>
          <div className="mt-5 inline-flex items-center gap-3">
            <Link
              href={user ? "/console/practice" : "/register"}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
            >
              {user ? "继续练习" : "立即注册"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/console/billing"
              className="inline-flex items-center gap-1 text-xs text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
            >
              查看挂科退款条款
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

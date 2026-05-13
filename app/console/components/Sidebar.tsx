"use client";

import {
  BarChart3,
  BookOpenText,
  CalendarRange,
  CreditCard,
  History,
  PenLine,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Role } from "@/lib/admin";

const userItems = [
  { href: "/console", label: "概览", icon: BarChart3 },
  { href: "/console/courses", label: "我的课件", icon: BookOpenText },
  { href: "/console/practice", label: "出题练习", icon: PenLine },
  { href: "/console/history", label: "批改历史", icon: History },
  { href: "/console/sprint", label: "冲刺计划", icon: CalendarRange },
  { href: "/console/billing", label: "订阅 / 兑换码", icon: CreditCard },
  { href: "/console/settings", label: "个人设置", icon: Settings },
];

const adminItems = [
  { href: "/console/admin", label: "管理概览", icon: ShieldCheck },
  { href: "/console/admin/users", label: "用户管理", icon: Users },
  { href: "/console/admin/orders", label: "订单管理", icon: Receipt },
  { href: "/console/admin/codes", label: "兑换码", icon: TicketCheck },
];

export function Sidebar({ role }: { role: Role }) {
  const path = usePathname();
  const showAdmin = role >= 1;

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white sm:flex">
      <Link
        href="/"
        className="flex items-center gap-2 border-b border-zinc-200 px-5 py-4 transition hover:bg-zinc-50"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-lg font-bold tracking-tight">临考</span>
        <span className="ml-auto text-[10px] font-medium text-amber-700">
          v0.1
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 text-sm">
        {userItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/console"
              ? path === "/console"
              : path === href || (path?.startsWith(href + "/") ?? false);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                isActive
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}

        {showAdmin && (
          <>
            <div className="mt-4 flex items-center gap-2 px-3 pb-1 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                管理员
              </span>
              <span className="h-px flex-1 bg-zinc-200" />
              {role === 10 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                  ROOT
                </span>
              )}
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/console/admin"
                  ? path === "/console/admin"
                  : path === href || (path?.startsWith(href + "/") ?? false);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                    isActive
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-zinc-700 hover:bg-red-50 hover:text-red-700"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <Link
          href="/console/billing"
          className="block rounded-lg bg-gradient-to-r from-amber-100 to-amber-50 p-3 text-xs"
        >
          <div className="font-semibold text-amber-900">🎁 19.9 元 / 单科</div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
            含挂科退款 · 7 天考前解锁模拟卷
          </p>
        </Link>
        <p className="mt-2 text-center text-[10px] text-zinc-400">
          30 天 MVP · 临考
        </p>
      </div>
    </aside>
  );
}

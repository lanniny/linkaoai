"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const initial = (email[0] ?? "?").toUpperCase();
  const display = email.length > 22 ? email.slice(0, 20) + "…" : email;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-3 transition hover:bg-zinc-50"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-white shadow-sm">
          {initial}
        </span>
        <span className="text-xs text-zinc-700">{display}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg">
          <div className="border-b border-zinc-100 px-3 py-2 text-[11px] text-zinc-500">
            登录为 <span className="font-mono text-zinc-700">{email}</span>
          </div>
          <Link
            href="/console/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-zinc-700 transition hover:bg-zinc-50"
          >
            <Settings className="h-3.5 w-3.5" />
            个人设置
          </Link>
          <form action="/auth/signout" method="post" className="block">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              退出登录
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

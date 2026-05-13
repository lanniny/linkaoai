"use client";

import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";

const labels: Record<string, string> = {
  "/console": "学习概览",
  "/console/courses": "我的课件",
  "/console/practice": "出题练习",
  "/console/history": "批改历史",
  "/console/sprint": "冲刺计划",
  "/console/billing": "订阅 / 兑换码",
  "/console/settings": "个人设置",
};

const subtitles: Record<string, string> = {
  "/console": "你的学习数据 · 解锁学科 · 最近订单",
  "/console/courses": "上传 PDF / TXT，AI 帮你提取大纲",
  "/console/practice": "AI 出题 + 实时批改 · 错题归档",
  "/console/history": "全部课件 + 出题 + 批改记录",
  "/console/sprint": "考前冲刺日历 · 每日复习计划",
  "/console/billing": "下单 / 兑换码 / 退款条款",
  "/console/settings": "邮箱、密码、订阅状态",
};

export function Header({ userEmail }: { userEmail: string }) {
  const path = usePathname() ?? "/console";
  // Match the exact prefix for dynamic routes like /console/history/[id]
  const matched = Object.keys(labels)
    .filter((p) => path === p || path.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const title = labels[matched ?? ""] ?? "Linkao";
  const subtitle = subtitles[matched ?? ""] ?? "";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/85 px-6 backdrop-blur">
      <div>
        <h1 className="text-base font-semibold text-zinc-900">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-zinc-500">{subtitle}</p>
        )}
      </div>
      <UserMenu email={userEmail} />
    </header>
  );
}

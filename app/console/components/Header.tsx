"use client";

import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

import type { Role } from "@/lib/admin";
import { UserMenu } from "./UserMenu";

const labels: Record<string, string> = {
  "/console": "学习概览",
  "/console/courses": "我的课件",
  "/console/practice": "出题练习",
  "/console/history": "批改历史",
  "/console/sprint": "冲刺计划",
  "/console/billing": "订阅 / 兑换码",
  "/console/settings": "个人设置",
  "/console/admin": "管理概览",
  "/console/admin/users": "用户管理",
  "/console/admin/orders": "订单管理",
  "/console/admin/codes": "兑换码管理",
  "/console/admin/channels": "AI 渠道路由",
  "/console/admin/logs": "AI 调用日志",
  "/console/admin/settings": "系统设置",
};

const subtitles: Record<string, string> = {
  "/console": "你的学习数据 · 解锁学科 · 最近订单",
  "/console/courses": "上传 PDF / TXT，AI 帮你提取大纲",
  "/console/practice": "AI 出题 + 实时批改 · 错题归档",
  "/console/history": "全部课件 + 出题 + 批改记录",
  "/console/sprint": "考前冲刺日历 · 每日复习计划",
  "/console/billing": "下单 / 兑换码 / 退款条款",
  "/console/settings": "邮箱、密码、订阅状态",
  "/console/admin": "全站用户 / 订单 / 收入概览",
  "/console/admin/users": "全部注册用户 · 角色 · 解锁状态",
  "/console/admin/orders": "全部订单 · 手动标记 paid",
  "/console/admin/codes": "批量生成 · 全部兑换码",
  "/console/admin/channels": "Anthropic 中转配置 · 优先级 · 健康检查",
  "/console/admin/logs": "Token 消费 · 错误率 · 路由过滤",
  "/console/admin/settings": "定价 / 配额 / 维护开关 / 公告",
};

export function Header({
  userEmail,
  role,
}: {
  userEmail: string;
  role: Role;
}) {
  const path = usePathname() ?? "/console";
  const matched = Object.keys(labels)
    .filter((p) => path === p || path.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const title = labels[matched ?? ""] ?? "Linkao";
  const subtitle = subtitles[matched ?? ""] ?? "";
  const isAdminArea = path.startsWith("/console/admin");

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/85 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {isAdminArea && (
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-red-50 px-2 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
            <ShieldCheck className="h-3 w-3" />
            ADMIN
          </span>
        )}
        <div>
          <h1 className="text-base font-semibold text-zinc-900">{title}</h1>
          {subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      <UserMenu email={userEmail} role={role} />
    </header>
  );
}

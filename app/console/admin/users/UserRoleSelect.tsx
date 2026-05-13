"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { Role } from "@/lib/admin";

export function UserRoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const [role, setRole] = useState<Role>(currentRole);
  const [loading, setLoading] = useState(false);

  async function handleChange(next: Role) {
    if (next === role) return;
    if (
      !confirm(
        `确定要把用户角色改为 ${
          next === 10 ? "Root" : next === 1 ? "Admin" : "User"
        } 吗？`,
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setRole(next);
      toast.success("角色已更新");
    } catch (err) {
      toast.error("更新失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={role}
      disabled={loading}
      onChange={(e) => handleChange(Number(e.target.value) as Role)}
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-50 ${
        role === 10
          ? "border-red-200 bg-red-50 text-red-700"
          : role === 1
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-zinc-200 bg-white text-zinc-600"
      }`}
    >
      <option value={0}>User</option>
      <option value={1}>Admin</option>
      <option value={10}>Root</option>
    </select>
  );
}

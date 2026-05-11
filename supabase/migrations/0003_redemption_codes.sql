-- ============================================================
-- Linkao · 0003 redemption codes
-- ============================================================
-- 用法：在 0001 + 0002 后顺序跑。
-- 目的：兑换码系统 — 主人 (admin) 用 service_role 后台脚本 / SQL 生成
--      一批 active 兑换码，发给用户；用户在 /pay 输入兑换码 → 调
--      /api/redemption/redeem (service_role 写) → 标记 code used +
--      创建一笔 paid payment 落 audit trail。
-- ============================================================

create table if not exists public.redemption_codes (
  id uuid primary key default gen_random_uuid(),
  -- 兑换码本身。长度 6-32，运营自己决定生成规则（推荐 base32 8-12 位）
  code text unique not null check (length(code) between 6 and 32),
  subject text not null check (subject in ('高数', '线代', '概率论', '其他')),
  -- 等价的现金面值；用于做 payments.amount_cny 记账
  amount_cny numeric(8,2) not null default 19.90,
  status text not null default 'active'
    check (status in ('active', 'used', 'expired', 'revoked')),
  -- 可选过期时间；NULL 表示永久有效
  expires_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists redemption_codes_active_idx
  on public.redemption_codes (code)
  where status = 'active';
create index if not exists redemption_codes_used_by_idx
  on public.redemption_codes (used_by, used_at desc)
  where status = 'used';

alter table public.redemption_codes enable row level security;

-- 普通用户对兑换码表零权限（看不到任何 row）。兑换流程必须走
-- service_role 写的 API 路由 (/api/redemption/redeem)；防止恶意用户
-- 直接查询表枚举有效 code。
-- 如果需要"我用过的兑换码列表"，加一条 SELECT policy: auth.uid() = used_by。
create policy "redemption_codes_used_self_select" on public.redemption_codes
  for select
  using (auth.uid() = used_by and status = 'used');

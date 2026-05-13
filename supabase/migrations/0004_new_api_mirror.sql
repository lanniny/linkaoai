-- ============================================================
-- Linkao · 0004 new-api parity mirror (Day 9 cont. · 2026-05-13)
-- ============================================================
-- 用法：在 0001 + 0002 + 0003 后顺序在 Supabase SQL Editor 跑一次。
-- 目的：建立 new-api SaaS 控制台镜像所需的 5 张新表 + payments 扩列。
--      由 vibe-governed 9-mapping 需求文档驱动，分别支撑：
--        M1 personal_access_tokens · M2 usage_counters
--        M3 ai_channels           · M4 ai_usage_logs
--        M7 payments refund 列    · M8 system_settings
-- 安全约定：
--   - 所有 user-scoped 表：RLS using auth.uid() = user_id。
--   - admin-only 表 (ai_channels / system_settings)：禁止匿名/普通 SELECT，
--     api 路由用 service_role 写读。
--   - ai_usage_logs：用户可读自己那部分，admin 通过 service_role 读全表。
-- ============================================================

-- ============================================================
-- M1 · personal_access_tokens
-- ============================================================
create table if not exists public.personal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  -- 显示前缀（如 "lkpat_AbCdEf"）方便用户辨认；不参与认证
  prefix text not null check (length(prefix) between 6 and 32),
  -- 仅存哈希；任何时候不存明文 secret
  token_hash text not null unique,
  -- 限定能力范围
  scopes text[] not null default array['read']::text[]
    check (
      scopes <@ array['read','write','admin']::text[]
      and array_length(scopes, 1) >= 1
    ),
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pat_user_idx
  on public.personal_access_tokens (user_id, created_at desc)
  where revoked_at is null;

alter table public.personal_access_tokens enable row level security;

create policy "pat_self_select" on public.personal_access_tokens
  for select using (auth.uid() = user_id);
create policy "pat_self_insert" on public.personal_access_tokens
  for insert with check (auth.uid() = user_id);
create policy "pat_self_update" on public.personal_access_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pat_self_delete" on public.personal_access_tokens
  for delete using (auth.uid() = user_id);

-- ============================================================
-- M2 · usage_counters · per-user monthly quota
-- ============================================================
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_ymd date not null,                  -- 月首日 (e.g. 2026-05-01)
  kind text not null check (
    kind in ('extract','generate_questions','grade','sprint_plan')
  ),
  used_n integer not null default 0 check (used_n >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_ymd, kind)
);

create index if not exists usage_user_month_idx
  on public.usage_counters (user_id, month_ymd desc);

alter table public.usage_counters enable row level security;
-- 用户只能 select 自己的；写入永远走 service_role（API 内部累加）。
create policy "usage_self_select" on public.usage_counters
  for select using (auth.uid() = user_id);

-- ============================================================
-- M3 · ai_channels · model routing config (admin-only)
-- ============================================================
create table if not exists public.ai_channels (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(label) between 1 and 60),
  base_url text not null check (length(base_url) between 6 and 300),
  model text not null check (length(model) between 1 and 80),
  -- 数字越小优先级越高
  priority integer not null default 100 check (priority between 0 and 9999),
  enabled boolean not null default true,
  -- 用于 health-check 显示；admin 页面调 ping 后更新
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists ai_channels_priority_idx
  on public.ai_channels (priority asc) where enabled;

alter table public.ai_channels enable row level security;
-- 不发任何 SELECT 给普通用户；admin API 用 service_role 读写。

-- 种子两条记录（与现有 .env 一致）：opus primary + haiku bulk。
insert into public.ai_channels (label, base_url, model, priority, enabled)
values
  ('Opus primary',   'https://www.openclaudecode.cn/', 'claude-opus-4-7',         10, true),
  ('Haiku bulk',     'https://www.openclaudecode.cn/', 'claude-haiku-4-5-20251001', 20, true)
on conflict do nothing;

-- ============================================================
-- M4 · ai_usage_logs · per-request audit log
-- ============================================================
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  -- 关联用户；匿名调用允许 null（理论不发生但留兜底）
  user_id uuid references auth.users(id) on delete set null,
  -- 哪条 channel；删 channel 时保留日志，不强制 FK
  channel_id uuid,
  route text not null check (
    route in ('extract','generate_questions','grade','sprint_plan')
  ),
  model text not null check (length(model) between 1 and 80),
  status text not null check (status in ('success','error','timeout','blocked')),
  latency_ms integer check (latency_ms >= 0),
  prompt_tokens integer check (prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens >= 0),
  -- 估算成本（CNY，分级累计用）
  cost_cny numeric(10,4) check (cost_cny >= 0),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_user_time_idx
  on public.ai_usage_logs (user_id, created_at desc);
create index if not exists usage_logs_route_time_idx
  on public.ai_usage_logs (route, created_at desc);
create index if not exists usage_logs_status_time_idx
  on public.ai_usage_logs (status, created_at desc) where status <> 'success';

alter table public.ai_usage_logs enable row level security;
-- 用户只能 select 自己的日志（用于 /console/settings 个人用量）；
-- admin 通过 service_role 看全表。
create policy "usage_logs_self_select" on public.ai_usage_logs
  for select using (auth.uid() = user_id);

-- ============================================================
-- M7 · payments 扩列 (refund + admin notes)
-- ============================================================
alter table public.payments
  add column if not exists refund_at timestamptz,
  add column if not exists refund_reason text,
  add column if not exists refund_by uuid references auth.users(id) on delete set null,
  add column if not exists notes_admin text;

-- 0001 的 status CHECK 已含 'refunded'；0002 扩展了 channel；
-- 这里只补"refund 后必须填 refund_at"软约束（仅 admin API 落库）。

-- ============================================================
-- M8 · system_settings · admin-tunable runtime config
-- ============================================================
create table if not exists public.system_settings (
  key text primary key check (length(key) between 1 and 60),
  value_json jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.system_settings enable row level security;
-- admin-only via service_role; no user-visible policy。

-- 默认配置 seed（admin UI 后续可改）：
insert into public.system_settings (key, value_json)
values
  ('pricing',           '{"高数": 19.90, "线代": 19.90, "概率论": 19.90, "其他": 19.90}'::jsonb),
  ('free_tier_quota',   '{"extract": 1, "generate_questions": 20, "grade": 60, "sprint_plan": 3}'::jsonb),
  ('maintenance',       '{"enabled": false, "message": ""}'::jsonb),
  ('announcement',      '{"enabled": false, "text": "", "href": null}'::jsonb)
on conflict (key) do nothing;

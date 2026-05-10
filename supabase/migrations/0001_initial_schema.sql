-- ============================================================
-- Linkao 临考 · 初始 schema
-- ============================================================
-- 用法（任选其一）：
--   1. 在 Supabase Dashboard → SQL Editor → New query 全文粘贴 → Run
--   2. CLI: supabase db push   （如果用了 supabase init）
--
-- 设计原则：
--   - Supabase Auth 已自带 auth.users，profiles 仅做扩展
--   - 所有用户数据走 RLS（Row Level Security），默认 deny
--   - timestamptz UTC + with time zone 'Asia/Shanghai' 不在数据库做，UI 层格式化
--   - 软删除字段 deleted_at；硬删除走 service_role 后台脚本
--   - 钱相关 (payments) 默认 service_role 写，普通用户只能读自己
-- ============================================================

set check_function_bodies = off;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. profiles : 扩展 auth.users
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  school text,
  major text,
  grade smallint check (grade between 1 and 6),  -- 大一=1 ... 研一=5 等
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_self_upsert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- 注册时自动建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. courses : 一次"上传 + 提取"会话
-- ------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('高数', '线代', '概率论', '其他')),
  source_title text,
  storage_path text,                  -- Supabase Storage object path (course-files bucket)
  file_size_bytes bigint,
  status text not null default 'extracting' check (status in ('extracting', 'ready', 'failed')),
  extract_meta jsonb,                 -- { model, usage, stop_reason }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists courses_user_idx on public.courses (user_id, created_at desc) where deleted_at is null;

alter table public.courses enable row level security;

create policy "courses_self_all" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. knowledge_points : 大纲条目
-- ------------------------------------------------------------
create table if not exists public.knowledge_points (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ordinal smallint not null,                       -- 大纲内顺序
  title text not null,
  level text not null check (level in ('必考', '重点', '了解')),
  explanation text not null,
  prerequisites text[],                            -- 可选前置知识点 title 列表
  estimated_minutes smallint check (estimated_minutes between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists kp_course_idx on public.knowledge_points (course_id, ordinal);
create index if not exists kp_user_level_idx on public.knowledge_points (user_id, level);

alter table public.knowledge_points enable row level security;

create policy "kp_self_all" on public.knowledge_points
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. questions : AI 生成的练习题
-- ------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  knowledge_point_id uuid references public.knowledge_points(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  qtype text not null check (qtype in ('multiple_choice', 'fill_blank', 'calculation', 'proof')),
  difficulty smallint check (difficulty between 1 and 5),
  prompt text not null,                            -- 题干（含 LaTeX）
  options jsonb,                                   -- 选择题选项 [{key:"A",text:"..."}]
  reference_answer text,                           -- 标准答案
  reference_explanation text,                      -- 标准解析
  generated_by text,                               -- 模型名
  created_at timestamptz not null default now()
);

create index if not exists q_course_idx on public.questions (course_id, created_at desc);

alter table public.questions enable row level security;

create policy "q_self_all" on public.questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. attempts : 用户答题 + AI 批改
-- ------------------------------------------------------------
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_answer text not null,
  is_correct boolean,
  ai_score numeric(4,2) check (ai_score between 0 and 100),
  ai_feedback text,
  graded_by text,                                  -- 模型名
  created_at timestamptz not null default now()
);

create index if not exists attempt_user_idx on public.attempts (user_id, created_at desc);
create index if not exists attempt_question_idx on public.attempts (question_id);

alter table public.attempts enable row level security;

create policy "attempt_self_all" on public.attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. weakness_points : 薄弱点追踪（可由 trigger 维护，MVP 期手动写）
-- ------------------------------------------------------------
create table if not exists public.weakness_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  knowledge_point_id uuid not null references public.knowledge_points(id) on delete cascade,
  miss_count smallint not null default 1,
  last_missed_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, knowledge_point_id)
);

create index if not exists weakness_user_idx on public.weakness_points (user_id, last_missed_at desc) where resolved_at is null;

alter table public.weakness_points enable row level security;

create policy "weakness_self_all" on public.weakness_points
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 7. sprint_plans : 冲刺计划
-- ------------------------------------------------------------
create table if not exists public.sprint_plans (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_date date not null,
  total_days smallint not null,
  daily_tasks jsonb not null,                      -- [{day:1, date:"2026-...", tasks:[{kp_id, minutes, done}]}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sprint_plans enable row level security;

create policy "sprint_self_all" on public.sprint_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8. mock_exams : 模拟卷（T-3 解锁的核心付费钩子）
-- ------------------------------------------------------------
create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  questions jsonb not null,                        -- 题目快照（不依赖 questions 表）
  user_answers jsonb,                              -- 用户答题
  ai_overall_feedback text,
  total_score numeric(5,2),
  generated_by text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

alter table public.mock_exams enable row level security;

create policy "mock_self_all" on public.mock_exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 9. payments : 19.9 元/单科 付费记录
-- ------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('高数', '线代', '概率论', '其他')),
  amount_cny numeric(8,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'failed')),
  channel text not null default 'wechat_manual' check (channel in ('wechat_manual', 'epay', 'hupijiao', 'alipay_manual')),
  external_ref text,                               -- 收款码截图 / 易支付订单号 等
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

-- 用户只能读自己 → 写入和审批由后台 service_role 完成
create policy "payment_self_select" on public.payments
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 10. updated_at trigger（通用）
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array['profiles', 'courses', 'sprint_plans', 'payments'])
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- Storage bucket policies（在 Dashboard → Storage 手动建 bucket `course-files` 后跑）
-- ------------------------------------------------------------
-- bucket: course-files (private)
-- create policy "course_files_self_upload" on storage.objects for insert
--   with check (bucket_id = 'course-files' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "course_files_self_read" on storage.objects for select
--   using (bucket_id = 'course-files' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "course_files_self_delete" on storage.objects for delete
--   using (bucket_id = 'course-files' and auth.uid()::text = (storage.foldername(name))[1]);
-- ↑ 命名约定：course-files/<user_id>/<course_id>.pdf

-- ============================================================
-- DONE. 跑完后 Dashboard → Database → Tables 应该看到 9 张表 + 全开 RLS。
-- ============================================================

-- 0001_subscriptions: Free/Plus/Pro 月订阅
-- 写入时机：服务器侧 sqlite3 data/linkao.db < drizzle/0001_subscriptions.sql
-- 安全：IF NOT EXISTS guard 使脚本可重复执行；现有 payments 行 plan 字段为 NULL，
-- lib/subscription.ts 把 NULL 视作"旧版单科购买"。

-- 1) payments 加 plan 字段（区分订单类型）
ALTER TABLE payments ADD COLUMN plan TEXT;

-- 2) subscriptions 表
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  plan                  TEXT NOT NULL,            -- 'plus' | 'pro'
  status                TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'cancelled'
  current_period_start  INTEGER NOT NULL,         -- timestamp_ms
  current_period_end    INTEGER NOT NULL,         -- timestamp_ms
  cancelled_at          INTEGER,                  -- timestamp_ms
  payment_id            TEXT,                     -- 链接到 payments 行
  created_at            INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id)    REFERENCES user(id)    ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS subscriptions_user_active_idx
  ON subscriptions(user_id, status, current_period_end);

CREATE INDEX IF NOT EXISTS subscriptions_payment_idx
  ON subscriptions(payment_id);

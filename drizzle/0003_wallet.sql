-- 0003_wallet: pay-as-you-go 钱包余额 + 流水
-- 写入时机：服务器侧 node-better-sqlite3 跑这个文件
-- 安全：CREATE TABLE IF NOT EXISTS — 可重复执行

CREATE TABLE IF NOT EXISTS wallet_balance (
  user_id        TEXT PRIMARY KEY,
  balance_cents  INTEGER NOT NULL DEFAULT 0,
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL,
  type                 TEXT NOT NULL,     -- 'topup' | 'consume' | 'refund'
  amount_cents         INTEGER NOT NULL,  -- 正=入账，负=扣款
  balance_after_cents  INTEGER NOT NULL,  -- snapshot 当时余额
  payment_id           TEXT,
  usage_log_id         TEXT,
  description          TEXT,
  created_at           INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id)    REFERENCES user(id)     ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS wallet_txn_user_time_idx
  ON wallet_transactions(user_id, created_at);

CREATE INDEX IF NOT EXISTS wallet_txn_type_idx
  ON wallet_transactions(type);

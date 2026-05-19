-- 0002_payments_period_days: 订阅订单的有效期长度
-- 写入时机：服务器侧 node-better-sqlite3 跑这个文件（项目无 sqlite3 CLI）
-- 安全：legacy 行 period_days IS NULL，跟 plan IS NULL 含义一致；新订阅订单
-- 写入 30 或 365，notify/mark-paid 据此决定 subscription period_end。

ALTER TABLE payments ADD COLUMN period_days INTEGER;

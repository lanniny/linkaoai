-- ============================================================
-- Linkao · 0002 payments channel set extended
-- ============================================================
-- 用法：与 0001 在同一个 Supabase 项目顺序跑（先 0001，再 0002）。
-- 目的：把 payments.channel 的 check 约束从初版的 4 项扩展到 5 项，
--      新增 epay_alipay / epay_wxpay 用于 EPay 自动支付，redemption_code
--      用于兑换码兑换的占位订单（Day 9）。
-- ============================================================

alter table public.payments
  drop constraint if exists payments_channel_check;

alter table public.payments
  add constraint payments_channel_check
  check (
    channel in (
      'wechat_manual',
      'alipay_manual',
      'epay_alipay',
      'epay_wxpay',
      'redemption_code'
    )
  );

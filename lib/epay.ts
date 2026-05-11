import "server-only";

import crypto from "crypto";

/**
 * 彩虹易支付 (EPay) 集成 — 国内常用的统一聚合支付网关。
 *
 * 协议简介：
 *   - 客户端通过 GET 跳转或表单 POST 把订单提交到 EPAY_URL/submit.php
 *   - EPay 显示收银台供用户选择渠道（alipay / wxpay / qqpay）
 *   - 支付完成 EPay 会向我们的 notify_url 发送异步通知（GET/POST 都可能）
 *   - 用户浏览器同步跳转回 return_url（带签名参数）
 *   - 我们校验 sign 后把 payments.status 从 pending → paid
 *
 * 签名规则（EPay 通用约定）：
 *   - 把所有非空参数（除 sign / sign_type 外）按 key 字典序拼成 a=v&b=v
 *   - 再拼上密钥 KEY，整体 MD5 取小写
 */

export interface EpayConfig {
  pid: string;
  key: string;
  url: string; // EPay 收银台 submit URL
  notifyUrl: string; // 我方接收异步通知的完整 URL
  returnUrl: string; // 用户同步跳转回来的完整 URL
}

export function getEpayConfig(): EpayConfig | null {
  const pid = process.env.EPAY_PID;
  const key = process.env.EPAY_KEY;
  const url = process.env.EPAY_URL;
  const notifyUrl = process.env.EPAY_NOTIFY_URL;
  const returnUrl = process.env.EPAY_RETURN_URL;
  if (!pid || !key || !url || !notifyUrl || !returnUrl) return null;
  return { pid, key, url, notifyUrl, returnUrl };
}

export function isEpayConfigured(): boolean {
  return getEpayConfig() !== null;
}

/** 字典序拼接非空参数 + KEY，整体 MD5 取小写。 */
export function epaySign(
  params: Record<string, string | undefined>,
  key: string,
): string {
  const filtered = Object.entries(params)
    .filter(
      ([k, v]) =>
        k !== "sign" &&
        k !== "sign_type" &&
        v !== undefined &&
        v !== null &&
        v !== "",
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const queryString = filtered.map(([k, v]) => `${k}=${v}`).join("&");
  return crypto
    .createHash("md5")
    .update(queryString + key)
    .digest("hex")
    .toLowerCase();
}

/** 校验 notify / return 携带的 sign 是否一致（防伪造）。 */
export function verifyEpayCallback(
  params: Record<string, string>,
  key: string,
): boolean {
  const givenSign = params.sign;
  if (!givenSign || givenSign.length !== 32) return false;
  const expected = epaySign(params, key);
  if (expected.length !== givenSign.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(givenSign, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export type EpayPaymentType = "alipay" | "wxpay" | "qqpay";

/** 构造完整跳转到 EPay 收银台的 URL（带签名）。 */
export function buildEpayPaymentUrl(
  config: EpayConfig,
  params: {
    type: EpayPaymentType;
    out_trade_no: string; // 我方订单号
    name: string;
    money: string; // 金额（元，2 位小数）
  },
): string {
  const all: Record<string, string> = {
    pid: config.pid,
    type: params.type,
    out_trade_no: params.out_trade_no,
    notify_url: config.notifyUrl,
    return_url: config.returnUrl,
    name: params.name,
    money: params.money,
    sign_type: "MD5",
  };
  const sign = epaySign(all, config.key);
  all.sign = sign;
  const qs = new URLSearchParams(all).toString();
  return `${config.url}?${qs}`;
}

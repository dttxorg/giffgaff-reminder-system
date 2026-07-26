import type { RedeemResult } from "./redeem";

export type RedeemErrorCode = Extract<
  RedeemResult,
  { ok: false }
>["error"];

const REDEEM_ERROR_MESSAGES: Record<RedeemErrorCode, string> = {
  INVALID_CODE: "卡密格式不正确",
  NOT_FOUND: "卡密不存在",
  EXPIRED: "卡密已过期",
  ALREADY_USED: "卡密已被兑换，无法重复使用",
  INVALID_PHONE: "手机号格式不正确",
  INVALID_DATE: "激活日期格式不正确（yyyy-MM-dd）",
  PASSWORD_REQUIRED: "首次兑换必须设置登录密码",
  PASSWORD_TOO_SHORT: "密码至少 8 位",
  USERNAME_REQUIRED: "首次兑换必须设置账号",
  USERNAME_INVALID: "账号格式不正确（3-20 位小写字母开头；或 6+ 位纯数字手机号）",
  USERNAME_TAKEN: "该账号已被占用，请换一个",
  USER_NOT_FOUND: "账号不存在，请重新登录",
  PHONE_TAKEN: "该手机号已被绑定，请联系管理员",
};

export function redeemErrorMessage(error: RedeemErrorCode): string {
  return REDEEM_ERROR_MESSAGES[error] ?? "兑换失败";
}

export function redeemErrorStatus(error: RedeemErrorCode): number {
  return error === "NOT_FOUND" || error === "ALREADY_USED" ? 404 : 400;
}

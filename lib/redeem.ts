// 卡密兑换核心逻辑：事务 + 幂等
//
// 客户拿到 unbound 卡密后，提交手机号 + 激活日期 + 设置密码。
// 系统创建 sim、user（带密码哈希），标记卡密已用，自动登录。
//
// 卡密本身就是"一次性激活凭证"，兑换后用手机号+密码登录。
import { prisma } from "./db";
import { normalizeCardCode } from "./card-key";
import { hashPassword } from "./auth";
import type { Prisma } from "./generated/prisma/client";

export type RedeemInput = {
  /** 用户输入的卡密（已归一化为原始 16 字符） */
  rawCode: string;
  /** 客户自己的手机号 */
  phoneNumber: string;
  /** 客户自己的激活日期 (yyyy-MM-dd) */
  activatedAt: string;
  /** 客户自己设置的登录密码（明文，函数内哈希） */
  password: string;
};

export type RedeemResult =
  | {
      ok: true;
      userId: number;
      simId: number;
    }
  | {
      ok: false;
      error:
        | "INVALID_CODE" // 卡密格式错
        | "NOT_FOUND" // 卡密不存在
        | "EXPIRED" // 卡密过期
        | "ALREADY_USED" // 卡密已兑换
        | "INVALID_PHONE" // 手机号格式错
        | "INVALID_DATE" // 日期格式错
        | "PASSWORD_TOO_SHORT" // 密码太短
        | "PHONE_TAKEN"; // 手机号已被绑定
    };

/**
 * 校验并解析 yyyy-MM-dd → Date (UTC 0:00)
 * (导出供测试,被 redeemCard 内部使用)
 */
export function parseDate(input: string): { ok: true; date: Date } | { ok: false } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return { ok: false };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return { ok: false };
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(date.getTime())) return { ok: false };
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false };
  }
  return { ok: true, date };
}

/**
 * 手机号：6-15 位数字
 */
export function isValidPhone(input: string): boolean {
  return /^\d{6,15}$/.test(input);
}

/**
 * 兑换卡密（事务安全）
 *
 * 成功返回 { ok: true, userId, simId }
 * 失败返回 { ok: false, error }
 */
export async function redeemCard(
  input: RedeemInput,
  tx?: Prisma.TransactionClient
): Promise<RedeemResult> {
  const db = tx ?? prisma;
  const rawCode = normalizeCardCode(input.rawCode);
  if (rawCode.length !== 16) {
    return { ok: false, error: "INVALID_CODE" };
  }

  const card = await db.cardKey.findUnique({ where: { code: rawCode } });
  if (!card) return { ok: false, error: "NOT_FOUND" };
  if (card.used) return { ok: false, error: "ALREADY_USED" };
  if (card.expiresAt && card.expiresAt < new Date()) {
    return { ok: false, error: "EXPIRED" };
  }

  if (!isValidPhone(input.phoneNumber)) {
    return { ok: false, error: "INVALID_PHONE" };
  }
  if (typeof input.password !== "string" || input.password.length < 8) {
    return { ok: false, error: "PASSWORD_TOO_SHORT" };
  }
  const parsed = parseDate(input.activatedAt);
  if (!parsed.ok) return { ok: false, error: "INVALID_DATE" };

  const phoneNumber = input.phoneNumber;
  const activatedAt = parsed.date;

  // 检查 phoneNumber 是否已被 sim 占用
  const existingSim = await db.sim.findUnique({ where: { phoneNumber } });
  if (existingSim) {
    return { ok: false, error: "PHONE_TAKEN" };
  }

  // 哈希密码
  const passwordHash = await hashPassword(input.password);

  // 创建 sim
  const sim = await db.sim.create({
    data: {
      phoneNumber,
      activatedAt,
      status: "active",
    },
  });

  // 创建 user（channel 占位，channelKey 留空，引导去 /me/settings 设置）
  const lookupKey = phoneNumber.slice(-6);
  const user = await db.user.create({
    data: {
      simId: sim.id,
      simLookupKey: lookupKey,
      channel: "serverchan",
      channelKey: "",
      passwordHash,
    },
  });

  // 标记卡密已用（双保险：usedSimId unique 也卡住重复）
  await db.cardKey.update({
    where: { id: card.id },
    data: {
      used: true,
      usedAt: new Date(),
      usedSimId: sim.id,
    },
  });

  return {
    ok: true,
    userId: user.id,
    simId: sim.id,
  };
}

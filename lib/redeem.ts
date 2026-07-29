// 卡密兑换核心逻辑:事务 + 幂等
//
// 两类入口:
//  1) 未登录(新用户):必填 username + password,创建新 user + sim,自动登录
//  2) 已登录(追加卡):只需 card+phone+date,把新 sim 挂到当前 user 下
//
// 渠道策略:
//  - 新用户的首张 sim: channel/channelKey 留空,引导去 /me/settings 设置
//  - 已登录用户追加 sim: 默认复制已有第一张 sim 的渠道(保证统一推送),
//    也可以在 /me/settings 里改成不同渠道
import { prisma } from "./db";
import { normalizeCardCode } from "./card-key";
import { hashPassword, normalizeUsername, usernameError } from "./auth";
import { parseISOCalendarDate } from "./date";
import { generatePortToken } from "./port-token";
import type { Prisma } from "./generated/prisma/client";
import {
  carrierPolicy,
  type CarrierType,
} from "./carrier";

export type RedeemInput = {
  /** 用户输入的卡密(已归一化为原始 16 字符) */
  rawCode: string;
  /** 客户自己想要的账号(老用户场景可填手机号,新用户可填自定义账号) */
  username?: string;
  /** 客户自己设置的登录密码(明文,函数内哈希) */
  password?: string;
  /** 客户自己的手机号 */
  phoneNumber: string;
  /** 客户自己的激活日期 (yyyy-MM-dd) */
  activatedAt: string;
  /** 运营商预设；未传保持旧客户端的 Giffgaff 默认。 */
  carrier?: CarrierType;
};

export type RedeemResult =
  | {
      ok: true;
      userId: number;
      simId: number;
      isNewUser: boolean;
    }
  | {
      ok: false;
      error:
        | "INVALID_CODE"
        | "NOT_FOUND"
        | "EXPIRED"
        | "ALREADY_USED"
        | "INVALID_PHONE"
        | "INVALID_DATE"
        | "PASSWORD_REQUIRED"
        | "PASSWORD_TOO_SHORT"
        | "USERNAME_REQUIRED"
        | "USERNAME_INVALID"
        | "USERNAME_TAKEN"
        | "USER_NOT_FOUND"
        | "PHONE_TAKEN";
    };

export function parseDate(input: string): { ok: true; date: Date } | { ok: false } {
  const date = parseISOCalendarDate(input);
  if (!date) return { ok: false };
  return { ok: true, date };
}

export function isValidPhone(input: string): boolean {
  return /^\d{6,15}$/.test(input);
}

/**
 * 兑换卡密(事务安全)
 *
 * @param input          兑换输入
 * @param currentUserId  已登录时传入 user.id(追加卡模式);未登录时传 undefined
 * @param tx             可选事务 client
 */
export async function redeemCard(
  input: RedeemInput,
  currentUserId: number | undefined,
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
    if (currentUserId === undefined) {
      // 新用户必须设密码
      return { ok: false, error: "PASSWORD_REQUIRED" };
    }
    // 追加卡不需要密码
  }
  if (typeof input.password === "string" && input.password.length > 0 && input.password.length < 8) {
    return { ok: false, error: "PASSWORD_TOO_SHORT" };
  }

  const parsed = parseDate(input.activatedAt);
  if (!parsed.ok) return { ok: false, error: "INVALID_DATE" };

  const phoneNumber = input.phoneNumber;
  const activatedAt = parsed.date;
  const carrier = input.carrier ?? "giffgaff";
  const schedule = carrierPolicy(carrier);

  // 检查 phoneNumber 是否已被 sim 占用
  const existingSim = await db.sim.findUnique({ where: { phoneNumber } });
  if (existingSim) {
    return { ok: false, error: "PHONE_TAKEN" };
  }

  // 决定走哪条路径
  let userId: number;
  let isNewUser: boolean;
  let defaultChannel: "serverchan" | "bark" | "pushplus" | "telegram" = "serverchan";
  let defaultChannelKey = "";

  if (currentUserId === undefined) {
    // 新用户流程:必须提供 username + password
    if (!input.username) return { ok: false, error: "USERNAME_REQUIRED" };
    const username = normalizeUsername(input.username);
    const uErr = usernameError(username);
    if (uErr) return { ok: false, error: "USERNAME_INVALID" };

    if (typeof input.password !== "string" || input.password.length < 8) {
      return { ok: false, error: "PASSWORD_TOO_SHORT" };
    }

    // 检查 username 唯一
    const existing = await db.user.findUnique({ where: { username } });
    if (existing) return { ok: false, error: "USERNAME_TAKEN" };

    // 真正创建用户放在原子占用卡密之后，避免并发失败时留下孤立账号。
    userId = 0;
    isNewUser = true;
  } else {
    // 追加卡流程
    const u = await db.user.findUnique({ where: { id: currentUserId } });
    if (!u) return { ok: false, error: "USER_NOT_FOUND" };
    userId = u.id;
    isNewUser = false;
    defaultChannel = u.defaultChannel ?? defaultChannel;
    defaultChannelKey = u.defaultChannelKey ?? defaultChannelKey;
  }

  // 先以 used=false 为条件原子占用卡密。并发请求中只有一个事务能成功；
  // 后续任一步失败都会随外层事务一起回滚，不会消耗卡密。
  const claimed = await db.cardKey.updateMany({
    where: { id: card.id, used: false },
    data: { used: true, usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return { ok: false, error: "ALREADY_USED" };
  }

  if (currentUserId === undefined) {
    const passwordHash = await hashPassword(input.password!);
    const created = await db.user.create({
      data: {
        username: normalizeUsername(input.username!),
        passwordHash,
      },
    });
    userId = created.id;
  }

  // 创建 sim
  const sim = await db.sim.create({
    data: {
      phoneNumber,
      portToken: generatePortToken(),
      activatedAt,
      carrier,
      reminderStartDay: schedule.reminderStartDay,
      cycleDays: schedule.cycleDays,
      status: "active",
      channel: defaultChannel,
      channelKey: defaultChannelKey,
      userId,
    },
  });

  // 标记卡密已用
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
    userId,
    simId: sim.id,
    isNewUser,
  };
}

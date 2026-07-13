// /admin/reminders 页面 where 子句构造(纯函数,可单测)
//
// 设计动机:
// - 原 page.tsx 内嵌 buildWhere 难以测试(需要 mock Prisma)
// - 抽出后 caller 仍负责 DB 查询(q→matchingSimIds),函数本身只做参数解析
// - 任何"非合法"输入静默忽略(返回 undefined),让 Prisma 自然不应用该过滤
//
// Round 128: 加 channel + bound 过滤(便于排查"哪个渠道最近失败多")
import type { Prisma } from "./generated/prisma/client";

const VALID_CHANNELS = ["serverchan", "bark", "pushplus", "telegram"] as const;
export type ChannelValue = (typeof VALID_CHANNELS)[number];

export function isChannelValue(s: string): s is ChannelValue {
  return (VALID_CHANNELS as readonly string[]).includes(s);
}

/** 直接用 Prisma 完整类型,确保 XOR 关系 filter 正常工作 */
export type ReminderWhere = Prisma.ReminderSentWhereInput;

export interface ReminderFilterParams {
  /** 数字 simId;非法值静默忽略 */
  simId?: string;
  /** "success" / "failed";其他值忽略 */
  status?: string;
  /** yyyy-MM-dd;非法格式忽略 */
  from?: string;
  /** yyyy-MM-dd;非法格式忽略 */
  to?: string;
  /** 推送渠道;必须是 Channel enum 之一 */
  channel?: string;
  /** "yes"=已绑(sim→user 存在);"no"=未绑 */
  bound?: string;
  /** 通过 q 查 DB 得到的匹配 simId 列表(caller 解析) */
  matchingSimIds?: number[];
}

/**
 * 把 URL searchParams 转成 Prisma where 子句。
 *
 * 行为细节:
 * - simId: `parseInt` 必须是有限数字,否则忽略
 * - simId + matchingSimIds 同时存在 → 取交集;若无交集返回 `{ in: [] }`(零结果)
 * - status: 严格等于 "success" / "failed",其他值忽略
 * - from/to: 合法 yyyy-MM-dd 转 UTC 范围;`to` +1 天确保整天包含
 * - channel: 必须是 4 个合法渠道之一;否则忽略
 * - bound: "yes" → `user.isNot = null`;"no" → `user.is = null`(等效 `user: null`)
 * - bound + channel 同时设置 → 合并到同一个 user relation filter
 *
 * 故意不处理的边界:
 * - "channel=X 且 unbound" 在语义上矛盾(有 user 才有 channel),
 *   让 Prisma 自然返回空集即可,不强制报错。
 */
export function buildReminderWhere(params: ReminderFilterParams): ReminderWhere {
  const where: ReminderWhere = {};

  // --- simId + matchingSimIds (求交集) ---
  // 用正则确保"全数字"而不是 parseInt 的前缀宽松匹配(parseInt("12abc") → 12)
  let simIdFilter: number | undefined;
  if (params.simId && /^\d+$/.test(params.simId)) {
    simIdFilter = parseInt(params.simId, 10);
  }

  if (params.matchingSimIds !== undefined) {
    if (simIdFilter !== undefined) {
      where.simId = params.matchingSimIds.includes(simIdFilter)
        ? simIdFilter
        : { in: [] };
    } else {
      where.simId = { in: params.matchingSimIds };
    }
  } else if (simIdFilter !== undefined) {
    where.simId = simIdFilter;
  }

  // --- status ---
  if (params.status === "success" || params.status === "failed") {
    where.status = params.status;
  }

  // --- date range ---
  const range: { gte?: Date; lt?: Date } = {};
  if (params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)) {
    range.gte = new Date(params.from + "T00:00:00Z");
  }
  if (params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to)) {
    const lt = new Date(params.to + "T00:00:00Z");
    lt.setUTCDate(lt.getUTCDate() + 1);
    range.lt = lt;
  }
  if (range.gte || range.lt) where.sentAt = range;

  // --- channel + bound (via user relation) ---
  // Prisma 7 的 UserScalarRelationFilter.is/isNot 类型上不接受 null,
  // 但运行时 Prisma 接受(参考 app/admin/sims/page.tsx 同款用法)。
  // 用 unknown 双断言绕过类型检查,运行时行为正确。
  if (params.channel && isChannelValue(params.channel)) {
    // 指定 channel 已隐含 bound=yes(user 必须存在才有 channel)
    where.user = { is: { channel: params.channel } };
  } else if (params.bound === "yes") {
    where.user = { isNot: null } as unknown as Prisma.ReminderSentWhereInput["user"];
  } else if (params.bound === "no") {
    where.user = { is: null } as unknown as Prisma.ReminderSentWhereInput["user"];
  }

  return where;
}

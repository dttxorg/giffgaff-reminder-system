// Session 管理：基于 HTTP-only cookie + 数据库 session 表
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";

const USER_COOKIE = "gg_user_session";
const ADMIN_COOKIE = "gg_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

type DashboardChannel = "serverchan" | "bark" | "pushplus" | "telegram";

interface CurrentUserDashboardRow {
  expiresAt: Date;
  username: string;
  simId: number | null;
  phoneNumber: string | null;
  status: "active" | "paused" | null;
  channel: DashboardChannel | null;
  missingChannel: boolean | null;
  dayOffset: number | null;
  createdAt: Date | null;
  isActive: boolean | null;
  activePortToken: string | null;
  activeActivatedAt: Date | null;
  activeLastPortedAt: Date | null;
  activeChannelKey: string | null;
}

export interface CurrentUserDashboardContext {
  username: string;
  sims: Array<{
    id: number;
    phoneNumber: string;
    status: "active" | "paused";
    channel: DashboardChannel;
    missingChannel: boolean;
    dayOffset: number;
    createdAt: Date;
  }>;
  activeSim: {
    id: number;
    phoneNumber: string;
    portToken: string | null;
    activatedAt: Date;
    lastPortedAt: Date | null;
    status: "active" | "paused";
    channel: DashboardChannel;
    channelKey: string;
  } | null;
}

export function summarizeCurrentUserDashboardRows(
  rows: CurrentUserDashboardRow[]
): CurrentUserDashboardContext | null {
  const first = rows[0];
  if (!first) return null;
  const simRows = rows.filter(
    (row): row is CurrentUserDashboardRow & {
      simId: number;
      phoneNumber: string;
      status: "active" | "paused";
      channel: DashboardChannel;
      missingChannel: boolean;
      dayOffset: number;
      createdAt: Date;
    } => row.simId !== null
  );
  const active = simRows.find((row) => row.isActive === true);

  return {
    username: first.username,
    sims: simRows.map((row) => ({
      id: row.simId,
      phoneNumber: row.phoneNumber,
      status: row.status,
      channel: row.channel,
      missingChannel: row.missingChannel,
      dayOffset: row.dayOffset,
      createdAt: row.createdAt,
    })),
    activeSim: active
      ? {
          id: active.simId,
          phoneNumber: active.phoneNumber,
          portToken: active.activePortToken,
          activatedAt: active.activeActivatedAt!,
          lastPortedAt: active.activeLastPortedAt,
          status: active.status,
          channel: active.channel,
          channelKey: active.activeChannelKey!,
        }
      : null,
  };
}

/**
 * 创建用户 session
 */
export async function createUserSession(userId: number): Promise<string> {
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  const session = await prisma.userSession.create({
    data: { userId, expiresAt },
  });
  const jar = await cookies();
  jar.set(USER_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return session.id;
}

/**
 * 获取用户中心首屏上下文。
 *
 * 单次 SQL 返回全部卡片摘要，并只为 URL 指定卡/最高优先级卡返回 token 与渠道密钥。
 */
export const getCurrentUserDashboardContext = cache(
  async (
    requestedSimId: number | null
  ): Promise<CurrentUserDashboardContext | null> => {
    const jar = await cookies();
    const sid = jar.get(USER_COOKIE)?.value;
    if (!sid) return null;

    const rows = await prisma.$queryRaw<CurrentUserDashboardRow[]>`
      WITH current_session AS (
        SELECT
          session."expiresAt",
          usr."id" AS "userId",
          usr."username"
        FROM "UserSession" session
        INNER JOIN "User" usr ON usr."id" = session."userId"
        WHERE session."id" = ${sid}
      ),
      sim_base AS (
        SELECT
          sim."id",
          sim."phoneNumber",
          sim."portToken",
          sim."activatedAt",
          sim."lastPortedAt",
          sim."status",
          sim."channel",
          sim."channelKey",
          sim."createdAt",
          (sim."channelKey" = '') AS "missingChannel",
          (
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::date
            - (
              COALESCE(sim."lastPortedAt", sim."activatedAt")
              + INTERVAL '8 hours'
            )::date
          )::int AS "dayOffset"
        FROM "Sim" sim
        INNER JOIN current_session current
          ON current."userId" = sim."userId"
      ),
      ranked_sims AS (
        SELECT
          sim_base.*,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE
                WHEN ${requestedSimId}::int IS NOT NULL
                  AND "id" = ${requestedSimId} THEN -1
                WHEN "status" = 'paused' THEN 4
                WHEN "dayOffset" > 180 THEN 0
                WHEN "dayOffset" >= 170 THEN 1
                WHEN "missingChannel" THEN 2
                ELSE 3
              END,
              "dayOffset" DESC,
              LENGTH("phoneNumber") ASC,
              "phoneNumber" ASC
          ) AS "simRank"
        FROM sim_base
      )
      SELECT
        current."expiresAt",
        current."username",
        ranked."id" AS "simId",
        ranked."phoneNumber",
        ranked."status"::text AS "status",
        ranked."channel"::text AS "channel",
        ranked."missingChannel",
        ranked."dayOffset",
        ranked."createdAt",
        (ranked."simRank" = 1) AS "isActive",
        CASE WHEN ranked."simRank" = 1 THEN ranked."portToken" END
          AS "activePortToken",
        CASE WHEN ranked."simRank" = 1 THEN ranked."activatedAt" END
          AS "activeActivatedAt",
        CASE WHEN ranked."simRank" = 1 THEN ranked."lastPortedAt" END
          AS "activeLastPortedAt",
        CASE WHEN ranked."simRank" = 1 THEN ranked."channelKey" END
          AS "activeChannelKey"
      FROM current_session current
      LEFT JOIN ranked_sims ranked ON TRUE
      ORDER BY ranked."id" ASC
    `;
    if (rows.length === 0) return null;
    if (rows[0].expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
      return null;
    }
    return summarizeCurrentUserDashboardRows(rows);
  }
);

/**
 * 只判断用户 session 是否有效，不加载 user.sims。
 * 给客户端导航状态接口使用，避免公共页面的根布局读取 Cookie 而整体动态化。
 */
export const getCurrentUserSessionStatus = cache(async (): Promise<boolean> => {
  const jar = await cookies();
  const sid = jar.get(USER_COOKIE)?.value;
  if (!sid) return false;
  const session = await prisma.userSession.findUnique({
    where: { id: sid },
    select: { expiresAt: true },
  });
  if (!session) return false;
  if (session.expiresAt < new Date()) {
    await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
    return false;
  }
  return true;
});

/** 只读取未校验的 Session Cookie，供把校验并入同一条 SQL 的写路径使用。 */
export async function getCurrentUserSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(USER_COOKIE)?.value ?? null;
}

/** 只读取当前 Session 的 userId，供不需要账号/SIM 详情的写接口使用。 */
export const getCurrentUserId = cache(async (): Promise<number | null> => {
  const jar = await cookies();
  const sid = jar.get(USER_COOKIE)?.value;
  if (!sid) return null;
  const session = await prisma.userSession.findUnique({
    where: { id: sid },
    select: { userId: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }
  return session.userId;
});

interface CurrentUserSettingsRow {
  expiresAt: Date;
  username: string;
  simId: number | null;
  phoneNumber: string | null;
  isSelected: boolean | null;
  selectedPortToken: string | null;
  selectedActivatedAt: Date | null;
  selectedLastPortedAt: Date | null;
  selectedChannel: DashboardChannel | null;
  selectedChannelKey: string | null;
}

export interface CurrentUserSettingsContext {
  username: string;
  sims: Array<{ id: number; phoneNumber: string }>;
  selectedSim: {
    id: number;
    phoneNumber: string;
    portToken: string | null;
    activatedAt: Date;
    lastPortedAt: Date | null;
    channel: DashboardChannel;
    channelKey: string;
  } | null;
}

export function summarizeCurrentUserSettingsRows(
  rows: CurrentUserSettingsRow[]
): CurrentUserSettingsContext | null {
  const first = rows[0];
  if (!first) return null;
  const simRows = rows.filter(
    (row): row is CurrentUserSettingsRow & {
      simId: number;
      phoneNumber: string;
    } => row.simId !== null
  );
  const selected = simRows.find((row) => row.isSelected === true);
  return {
    username: first.username,
    sims: simRows.map((row) => ({
      id: row.simId,
      phoneNumber: row.phoneNumber,
    })),
    selectedSim: selected
      ? {
          id: selected.simId,
          phoneNumber: selected.phoneNumber,
          portToken: selected.selectedPortToken,
          activatedAt: selected.selectedActivatedAt!,
          lastPortedAt: selected.selectedLastPortedAt,
          channel: selected.selectedChannel!,
          channelKey: selected.selectedChannelKey!,
        }
      : null,
  };
}

/** 设置页上下文：全卡只返回选择器摘要，完整表单字段仅返回当前卡。 */
export const getCurrentUserSettingsContext = cache(
  async (
    requestedSimId: number | null
  ): Promise<CurrentUserSettingsContext | null> => {
    const jar = await cookies();
    const sid = jar.get(USER_COOKIE)?.value;
    if (!sid) return null;

    const rows = await prisma.$queryRaw<CurrentUserSettingsRow[]>`
      WITH current_session AS (
        SELECT
          session."expiresAt",
          usr."id" AS "userId",
          usr."username"
        FROM "UserSession" session
        INNER JOIN "User" usr ON usr."id" = session."userId"
        WHERE session."id" = ${sid}
      ),
      ranked_sims AS (
        SELECT
          sim.*,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE
                WHEN ${requestedSimId}::int IS NOT NULL
                  AND sim."id" = ${requestedSimId} THEN 0
                ELSE 1
              END,
              sim."id" ASC
          ) AS "simRank"
        FROM "Sim" sim
        INNER JOIN current_session current
          ON current."userId" = sim."userId"
      )
      SELECT
        current."expiresAt",
        current."username",
        ranked."id" AS "simId",
        ranked."phoneNumber",
        (ranked."simRank" = 1) AS "isSelected",
        CASE WHEN ranked."simRank" = 1 THEN ranked."portToken" END
          AS "selectedPortToken",
        CASE WHEN ranked."simRank" = 1 THEN ranked."activatedAt" END
          AS "selectedActivatedAt",
        CASE WHEN ranked."simRank" = 1 THEN ranked."lastPortedAt" END
          AS "selectedLastPortedAt",
        CASE WHEN ranked."simRank" = 1 THEN ranked."channel"::text END
          AS "selectedChannel",
        CASE WHEN ranked."simRank" = 1 THEN ranked."channelKey" END
          AS "selectedChannelKey"
      FROM current_session current
      LEFT JOIN ranked_sims ranked ON TRUE
      ORDER BY ranked."id" ASC
    `;
    if (rows.length === 0) return null;
    if (rows[0].expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
      return null;
    }
    return summarizeCurrentUserSettingsRows(rows);
  }
);

export interface CurrentUserSessionSummary {
  username: string;
  simCount: number;
}

/** 兑换页需要的最小账号上下文，不加载 SIM 详情或渠道密钥。 */
export const getCurrentUserSessionSummary = cache(
  async (): Promise<CurrentUserSessionSummary | null> => {
    const jar = await cookies();
    const sid = jar.get(USER_COOKIE)?.value;
    if (!sid) return null;
    const session = await prisma.userSession.findUnique({
      where: { id: sid },
      select: {
        expiresAt: true,
        user: {
          select: {
            username: true,
            _count: { select: { sims: true } },
          },
        },
      },
    });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
      return null;
    }
    return {
      username: session.user.username,
      simCount: session.user._count.sims,
    };
  }
);

/**
 * 销毁用户 session
 */
export async function destroyUserSession() {
  const jar = await cookies();
  const sid = jar.get(USER_COOKIE)?.value;
  if (sid) {
    await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
  }
  jar.delete(USER_COOKIE);
}

/**
 * 创建管理员 session
 */
export async function createAdminSession(): Promise<string> {
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  const session = await prisma.adminSession.create({
    data: { expiresAt },
  });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return session.id;
}

/**
 * 验证管理员 session
 */
export const getAdminSession = cache(async (): Promise<boolean> => {
  const jar = await cookies();
  const sid = jar.get(ADMIN_COOKIE)?.value;
  if (!sid) return false;
  const session = await prisma.adminSession.findUnique({
    where: { id: sid },
    select: { expiresAt: true },
  });
  if (!session) return false;
  if (session.expiresAt < new Date()) {
    await prisma.adminSession.delete({ where: { id: sid } }).catch(() => {});
    return false;
  }
  return true;
});

export async function destroyAdminSession() {
  const jar = await cookies();
  const sid = jar.get(ADMIN_COOKIE)?.value;
  if (sid) {
    await prisma.adminSession.delete({ where: { id: sid } }).catch(() => {});
  }
  jar.delete(ADMIN_COOKIE);
}

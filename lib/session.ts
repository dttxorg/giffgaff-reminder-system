// Session 管理：基于 HTTP-only cookie + 数据库 session 表
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";

const USER_COOKIE = "gg_user_session";
const ADMIN_COOKIE = "gg_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

/** 用户中心首页需要的 Session + 完整卡片字段。 */
const CURRENT_USER_SESSION_SELECT = {
  expiresAt: true,
  user: {
    select: {
      id: true,
      username: true,
      sims: {
        orderBy: { id: "asc" as const },
        select: {
          id: true,
          phoneNumber: true,
          portToken: true,
          activatedAt: true,
          lastPortedAt: true,
          status: true,
          channel: true,
          channelKey: true,
          createdAt: true,
        },
      },
    },
  },
};

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
 * 获取当前登录用户
 *
 * 用 React cache() 包裹: 单次请求内多次调用只产生一次 DB 查询。
 *
 * cookies() 在一次请求内返回同样的值,所以 cache() 的去重是安全的。
 *
 * 返回 user.sims[] (1:N),按 id 升序;1 个账号下挂多张 SIM 卡。
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const sid = jar.get(USER_COOKIE)?.value;
  if (!sid) return null;
  const session = await prisma.userSession.findUnique({
    where: { id: sid },
    select: CURRENT_USER_SESSION_SELECT,
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }
  return session.user;
});

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

export interface CurrentUserPushHistoryContext {
  sims: Array<{
    id: number;
    activatedAt: Date;
    lastPortedAt: Date | null;
  }>;
}

/** 推送历史页的最小账号上下文，不读取号码、公开 token 或渠道密钥。 */
export const getCurrentUserPushHistoryContext = cache(
  async (): Promise<CurrentUserPushHistoryContext | null> => {
    const jar = await cookies();
    const sid = jar.get(USER_COOKIE)?.value;
    if (!sid) return null;
    const session = await prisma.userSession.findUnique({
      where: { id: sid },
      select: {
        expiresAt: true,
        user: {
          select: {
            sims: {
              orderBy: { id: "asc" },
              select: {
                id: true,
                activatedAt: true,
                lastPortedAt: true,
              },
            },
          },
        },
      },
    });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
      return null;
    }
    return session.user;
  }
);

export interface CurrentUserSettingsContext {
  username: string;
  sims: Array<{
    id: number;
    phoneNumber: string;
    portToken: string | null;
    activatedAt: Date;
    lastPortedAt: Date | null;
    channel: "serverchan" | "bark" | "pushplus" | "telegram";
    channelKey: string;
  }>;
}

/** 设置页上下文：保留选择器和当前卡表单字段，不读取状态与创建时间。 */
export const getCurrentUserSettingsContext = cache(
  async (): Promise<CurrentUserSettingsContext | null> => {
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
            sims: {
              orderBy: { id: "asc" },
              select: {
                id: true,
                phoneNumber: true,
                portToken: true,
                activatedAt: true,
                lastPortedAt: true,
                channel: true,
                channelKey: true,
              },
            },
          },
        },
      },
    });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
      return null;
    }
    return session.user;
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

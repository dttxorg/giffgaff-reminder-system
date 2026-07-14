// Session 管理：基于 HTTP-only cookie + 数据库 session 表
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";

const USER_COOKIE = "gg_user_session";
const ADMIN_COOKIE = "gg_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

/**
 * 包含的 user 形状：
 * - user（含 username / channel / channelKey / passwordHash 等）
 * - user.sim  (1:1 - 一个账号只对应一张 SIM 卡)
 */
const USER_INCLUDE = {
  user: {
    include: { sim: true },
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
 * 这是 G5 修复的一部分 — 配合 layout 用 Suspense 流式渲染 UserNav,
 * 整页响应时间不再被这一查阻塞。
 *
 * cookies() 在一次请求内返回同样的值,所以 cache() 的去重是安全的。
 *
 * 返回 user.sim (1:1)。一个账号只对应一张 SIM 卡,想多张需要多个账号。
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const sid = jar.get(USER_COOKIE)?.value;
  if (!sid) return null;
  const session = await prisma.userSession.findUnique({
    where: { id: sid },
    include: USER_INCLUDE,
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.userSession.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }
  return session.user;
});

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
 *
 * 同 getCurrentUser,用 cache() 去重。
 */
export const getAdminSession = cache(async (): Promise<boolean> => {
  const jar = await cookies();
  const sid = jar.get(ADMIN_COOKIE)?.value;
  if (!sid) return false;
  const session = await prisma.adminSession.findUnique({ where: { id: sid } });
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

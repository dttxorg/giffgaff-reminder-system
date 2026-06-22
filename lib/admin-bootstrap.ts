// 默认管理员账号初始化（依赖 DB，独立成文件以避免 auth.ts 引入 Prisma 副作用）
import { prisma } from "./db";
import { hashPassword } from "./auth";

/**
 * 确保默认管理员账号存在
 * V1 单管理员模式：环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 决定首登账号
 * 如未设置，使用默认 admin / admin123（生产应改）
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) return;
  const passwordHash = await hashPassword(password);
  await prisma.adminUser.create({
    data: { username, passwordHash },
  });
  console.log(`[admin] 已创建默认管理员：${username}`);
}
// Prisma client 单例（避免开发时热重载创建多个实例）
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 兼容多种 Vercel Neon 集成注入的变量名
function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      "DATABASE_URL 未设置。请在 .env 或 Vercel 环境变量中配置。" +
        "Vercel Neon 集成通常自动注入 POSTGRES_PRISMA_URL。"
    );
  }
  return url;
}

function createPrisma() {
  const connectionString = getDatabaseUrl();
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

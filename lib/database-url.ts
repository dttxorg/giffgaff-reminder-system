export type DatabaseEnvironment = Partial<
  Record<
    | "DATABASE_URL"
    | "POSTGRES_PRISMA_URL"
    | "POSTGRES_URL"
    | "POSTGRES_URL_NON_POOLING",
    string
  >
>;

/**
 * Serverless 运行时优先使用 Prisma/pooler 专用地址；
 * 只有未提供池化地址时才退回通用或非池化连接。
 */
export function resolveRuntimeDatabaseUrl(env: DatabaseEnvironment): string {
  const url =
    env.POSTGRES_PRISMA_URL ||
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      "DATABASE_URL 未设置。请在 .env 或 Vercel 环境变量中配置。" +
        "Vercel Neon 集成通常自动注入 POSTGRES_PRISMA_URL。"
    );
  }
  return url;
}

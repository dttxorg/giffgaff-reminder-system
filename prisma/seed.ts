// 数据库 seed 脚本
// 用法：npx tsx prisma/seed.ts 或 npx prisma db seed

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL 未设置。请在 .env 或 Vercel 环境变量中配置。" +
      "Vercel Neon 集成通常自动注入 POSTGRES_PRISMA_URL。"
  );
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. 默认管理员
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (!existing) {
    await prisma.adminUser.create({
      data: { username, passwordHash: await hashPassword(password) },
    });
    console.log(`[seed] 创建管理员: ${username}`);
  }

  // 2. 默认文案
  const template = await prisma.setting.findUnique({ where: { key: "reminder_template" } });
  if (!template) {
    await prisma.setting.create({
      data: {
        key: "reminder_template",
        value: "【Giffgaff 报号提醒】您的号码 {{phone}} 已激活 {{days}} 天，该报号啦！\n点击更新保号时间：{{port_url}}",
      },
    });
    console.log(`[seed] 创建默认提醒模板`);
  }

  // 3. 测试 sim（仅当数据库为空时）
  const simCount = await prisma.sim.count();
  if (simCount === 0) {
    const now = new Date();
    const days = (n: number) => new Date(now.getTime() - n * 86400000);
    const samples = [
      { phone: "07724215611", activated: days(60) }, // 60 天
      { phone: "07724215612", activated: days(175) }, // 175 天 → 提醒窗口
      { phone: "07724215613", activated: days(179) }, // 179 天
      { phone: "07724215614", activated: days(181) }, // 181 天 → 停止
    ];
    for (const s of samples) {
      await prisma.sim.create({
        data: { phoneNumber: s.phone, activatedAt: s.activated },
      });
    }
    console.log(`[seed] 创建 ${samples.length} 个测试 sim`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

// 数据库 seed 脚本
// 用法：npx tsx prisma/seed.ts 或 npx prisma db seed

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth";
import { readAdminProvisioningCredentials } from "../lib/admin-bootstrap";
import { generatePortToken } from "../lib/port-token";

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
  // 1. 显式配置管理员；重复运行会轮换密码并撤销全部旧管理员会话。
  const { username, password } = readAdminProvisioningCredentials();
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.adminUser.upsert({
      where: { username },
      update: { passwordHash },
      create: { username, passwordHash },
    }),
    prisma.adminSession.deleteMany(),
  ]);
  console.log(`[seed] 已配置管理员: ${username}`);

  // 2. 默认文案
  const template = await prisma.setting.findUnique({ where: { key: "reminder_template" } });
  if (!template) {
    await prisma.setting.create({
      data: {
        key: "reminder_template",
        value: "【Giffgaff 保号提醒】您的号码 {{phone}} 已激活 {{days}} 天，该保号啦！\n点击更新保号时间：{{port_url}}",
      },
    });
    console.log(`[seed] 创建默认提醒模板`);
  }

  // 3. 样例 SIM 仅在显式启用时创建，避免生产 seed 注入测试号码。
  const simCount = await prisma.sim.count();
  if (process.env.SEED_SAMPLE_DATA === "true" && simCount === 0) {
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
        data: {
          phoneNumber: s.phone,
          activatedAt: s.activated,
          portToken: generatePortToken(),
        },
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

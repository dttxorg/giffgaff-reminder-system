import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("后台列表查询预算", () => {
  const sims = fs.readFileSync("app/admin/sims/page.tsx", "utf8");
  const users = fs.readFileSync("app/admin/users/page.tsx", "utf8");
  const cards = fs.readFileSync("app/admin/cards/page.tsx", "utf8");
  const reminders = fs.readFileSync("app/admin/reminders/page.tsx", "utf8");
  const userDetail = fs.readFileSync("app/admin/users/[id]/page.tsx", "utf8");
  const userClient = fs.readFileSync("app/admin/users/users-client.tsx", "utf8");
  const simTable = fs.readFileSync(
    "app/admin/sims/_components/sims-bulk-table.tsx",
    "utf8"
  );

  it("号码概览合并为一次状态聚合，仅在有筛选时 count", () => {
    expect(sims).toContain('prisma.sim.groupBy({');
    expect(sims).toContain('by: ["status"]');
    expect(sims).toContain("hasFilters ? prisma.sim.count({ where })");
    expect(sims).not.toContain("prisma.sim.count()");
    expect(sims).not.toContain("user: true");
    expect(sims).toContain("select: {");
  });

  it("用户概览用一次 aggregate 计算总数与非空密码数", () => {
    expect(users).toContain("select: { phoneNumber: true, channel: true }");
    expect(users).not.toContain("include: { sims:");
    expect(users).toContain("prisma.user.aggregate({");
    expect(users).toContain("_count: { _all: true, passwordHash: true }");
    expect(users).not.toContain("prisma.user.count()");
  });

  it("用户详情不读取 SIM 渠道密钥或公开 token", () => {
    expect(userDetail).not.toContain("include: { sims:");
    expect(userDetail).not.toContain("channelKey: true");
    expect(userDetail).not.toContain("portToken: true");
    expect(userDetail).toContain("lastPortedAt: true");
  });

  it("用户详情把提醒总数并入用户查询,不再单独 count", () => {
    expect(userDetail).toContain("_count: { select: { reminders: true } }");
    expect(userDetail).toContain("const reminderCount = user._count.reminders");
    expect(userDetail).not.toContain("prisma.reminderSent.count");
  });

  it("卡密概览合并为一次兑换状态聚合，并使用过滤总数分页", () => {
    expect(cards).toContain("prisma.cardKey.groupBy({");
    expect(cards).toContain('by: ["used"]');
    expect(cards).not.toContain("prisma.cardKey.count()");
    expect(cards).toContain("totalCount={filteredCount}");
  });

  it("提醒日志只读取列表实际展示的字段", () => {
    expect(reminders).not.toContain("include: { sim: true, user: true }");
    expect(reminders).not.toContain("user: true");
    expect(reminders).toContain(
      "sim: { select: { phoneNumber: true } }"
    );
    expect(reminders).toContain("prefetch={false}");
  });

  it("高密度用户与号码列表不批量预取详情", () => {
    expect(userClient).toContain("prefetch={false}");
    expect(simTable).toContain("prefetch={false}");
  });
});

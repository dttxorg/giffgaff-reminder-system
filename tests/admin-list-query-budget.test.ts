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

  it("号码分页只保留一次过滤 count，且不读取完整 user", () => {
    expect(sims.match(/prisma\.sim\.count\(\{ where \}\)/g)).toHaveLength(1);
    expect(sims).not.toContain("user: true");
    expect(sims).toContain("select: {");
  });

  it("用户列表限制嵌套 SIM 字段", () => {
    expect(users).toContain("select: { phoneNumber: true, channel: true }");
    expect(users).not.toContain("include: { sims:");
  });

  it("用户详情不读取 SIM 渠道密钥或公开 token", () => {
    expect(userDetail).not.toContain("include: { sims:");
    expect(userDetail).not.toContain("channelKey: true");
    expect(userDetail).not.toContain("portToken: true");
    expect(userDetail).toContain("lastPortedAt: true");
  });

  it("卡密列表和统计同一轮加载，并使用过滤总数分页", () => {
    expect(cards).toContain(
      "const [cards, totalCount, unusedCount, filteredCount] = await Promise.all(["
    );
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

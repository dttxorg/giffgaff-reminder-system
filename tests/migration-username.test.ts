/**
 * 测试迁移脚本里 username 生成逻辑的纯函数版本。
 * 实际 SQL 在 migration 文件里,这里是逻辑等价的 TS 实现,
 * 用来锁定"老数据怎么生成 username"的业务规则。
 *
 * 历史:之前用 phoneNumber.slice(-6) 作 simLookupKey 登录,
 *      重构后必须给老 user 生成 username。
 *      现在策略:User.username = sim.phoneNumber,客户无感迁移。
 */
import { describe, it, expect } from "vitest";

type Sim = { id: number; phoneNumber: string };
type User = { id: number; simId: number | null };

/** 与 migration.sql 等价:用 sim.phoneNumber 作为 username */
function generateUsername(user: User, sims: Sim[]): string {
  if (user.simId == null) return `u_${user.id}`;
  const sim = sims.find((s) => s.id === user.simId);
  if (!sim) return `u_${user.id}`;
  return sim.phoneNumber;
}

describe("迁移 username 生成(逻辑等价于 migration.sql)", () => {
  it("正常 1:1 → username = sim.phoneNumber", () => {
    const sims: Sim[] = [
      { id: 10, phoneNumber: "07724215611" },
      { id: 11, phoneNumber: "07724123456" },
    ];
    const users: User[] = [
      { id: 1, simId: 10 },
      { id: 2, simId: 11 },
    ];
    expect(generateUsername(users[0], sims)).toBe("07724215611");
    expect(generateUsername(users[1], sims)).toBe("07724123456");
  });

  it("simId 缺失(异常老数据) → 兜底 u_<id>", () => {
    const sims: Sim[] = [{ id: 10, phoneNumber: "07724215611" }];
    const users: User[] = [
      { id: 7, simId: null },
      { id: 8, simId: 10 },
    ];
    expect(generateUsername(users[0], sims)).toBe("u_7");
    expect(generateUsername(users[1], sims)).toBe("07724215611");
  });

  it("全表唯一(phoneNumber unique 兜底)", () => {
    const sims: Sim[] = [
      { id: 1, phoneNumber: "07724111111" },
      { id: 2, phoneNumber: "07724222222" },
      { id: 3, phoneNumber: "07724333333" },
    ];
    const users: User[] = [
      { id: 100, simId: 1 },
      { id: 101, simId: 2 },
      { id: 102, simId: 3 },
    ];
    const names = users.map((u) => generateUsername(u, sims));
    expect(new Set(names).size).toBe(users.length);
    expect(names).toEqual(["07724111111", "07724222222", "07724333333"]);
  });

  it("生成的 username 可以直接用手机号登录(无感迁移)", () => {
    const sims: Sim[] = [{ id: 10, phoneNumber: "07724215611" }];
    const user: User = { id: 1, simId: 10 };
    const username = generateUsername(user, sims);
    // 客户之前输的"07724215611"现在直接是 username
    expect(username).toBe("07724215611");
    // 跟之前的"07724 215611"(带空格)归一化后也能匹配
    expect(username.replace(/\D/g, "")).toBe("07724215611");
  });
});

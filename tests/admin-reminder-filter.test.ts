import { describe, it, expect } from "vitest";
import { buildReminderWhere, hasAnyReminderFilter, isChannelValue } from "../lib/admin-reminder-filter";

describe("isChannelValue", () => {
  it("接受 4 个合法 channel", () => {
    expect(isChannelValue("serverchan")).toBe(true);
    expect(isChannelValue("bark")).toBe(true);
    expect(isChannelValue("pushplus")).toBe(true);
    expect(isChannelValue("telegram")).toBe(true);
  });
  it("拒绝非法 channel", () => {
    expect(isChannelValue("")).toBe(false);
    expect(isChannelValue("wechat")).toBe(false);
    expect(isChannelValue("SERVERCHAN")).toBe(false);
    expect(isChannelValue("server_chan")).toBe(false);
  });
});

describe("buildReminderWhere — simId", () => {
  it("空参数 → 空 where", () => {
    expect(buildReminderWhere({})).toEqual({});
  });
  it("合法数字 simId → number", () => {
    expect(buildReminderWhere({ simId: "42" })).toEqual({ simId: 42 });
  });
  it("非法 simId(空) → 忽略", () => {
    expect(buildReminderWhere({ simId: "" })).toEqual({});
  });
  it("非法 simId(非数字) → 忽略", () => {
    expect(buildReminderWhere({ simId: "abc" })).toEqual({});
  });
  it("非法 simId(混合) → 忽略", () => {
    expect(buildReminderWhere({ simId: "12abc" })).toEqual({});
  });
  it("零和超大 simId → 忽略", () => {
    expect(buildReminderWhere({ simId: "0" })).toEqual({});
    expect(buildReminderWhere({ simId: "999999999999999999999" })).toEqual({});
  });
});

describe("buildReminderWhere — userId", () => {
  it("合法 userId 直接过滤提醒归属", () => {
    expect(buildReminderWhere({ userId: "42" })).toEqual({ userId: 42 });
  });

  it("混合、零和超大 userId 被忽略", () => {
    expect(buildReminderWhere({ userId: "12abc" })).toEqual({});
    expect(buildReminderWhere({ userId: "0" })).toEqual({});
    expect(buildReminderWhere({ userId: "999999999999999999999" })).toEqual({});
  });
});

describe("buildReminderWhere — status", () => {
  it("success / failed → 直接传递", () => {
    expect(buildReminderWhere({ status: "success" })).toEqual({ status: "success" });
    expect(buildReminderWhere({ status: "failed" })).toEqual({ status: "failed" });
  });
  it("其他值 → 忽略", () => {
    expect(buildReminderWhere({ status: "pending" })).toEqual({});
    expect(buildReminderWhere({ status: "" })).toEqual({});
  });
});

describe("buildReminderWhere — 日期范围", () => {
  it("合法 from → sentAt.gte", () => {
    const r = buildReminderWhere({ from: "2026-07-01" });
    // sentAt 类型是 string | Date | DateTimeFilter,断言时收敛到对象分支
    const range = r.sentAt as { gte?: Date; lt?: Date } | undefined;
    expect(range?.gte).toEqual(new Date("2026-07-01T00:00:00Z"));
    expect(range?.lt).toBeUndefined();
  });
  it("合法 to → sentAt.lt 为次日 00:00 UTC(整天包含)", () => {
    const r = buildReminderWhere({ to: "2026-07-12" });
    const range = r.sentAt as { gte?: Date; lt?: Date } | undefined;
    expect(range?.lt).toEqual(new Date("2026-07-13T00:00:00Z"));
    expect(range?.gte).toBeUndefined();
  });
  it("from + to 同时设置 → sentAt 范围完整", () => {
    const r = buildReminderWhere({ from: "2026-07-01", to: "2026-07-12" });
    const range = r.sentAt as { gte?: Date; lt?: Date } | undefined;
    expect(range?.gte).toEqual(new Date("2026-07-01T00:00:00Z"));
    expect(range?.lt).toEqual(new Date("2026-07-13T00:00:00Z"));
  });
  it("非法日期格式 → 忽略", () => {
    expect(buildReminderWhere({ from: "2026/07/01" }).sentAt).toBeUndefined();
    expect(buildReminderWhere({ from: "07-01-2026" }).sentAt).toBeUndefined();
    expect(buildReminderWhere({ to: "abc" }).sentAt).toBeUndefined();
  });
});

describe("buildReminderWhere — 手机号关系过滤", () => {
  it("格式化手机号后直接过滤 sim.phoneNumber", () => {
    expect(buildReminderWhere({ q: "07724 215 611" })).toEqual({
      sim: { phoneNumber: { contains: "07724215611" } },
    });
  });
  it("支持用手机号后六位搜索", () => {
    expect(buildReminderWhere({ q: "215611" })).toEqual({
      sim: { phoneNumber: { contains: "215611" } },
    });
  });
  it("纯空白搜索静默忽略", () => {
    expect(buildReminderWhere({ q: "   " })).toEqual({});
  });
  it("simId 与手机号同时存在时保留两个条件,由数据库直接求交集", () => {
    expect(buildReminderWhere({ simId: "2", q: "215611" })).toEqual({
      simId: 2,
      sim: { phoneNumber: { contains: "215611" } },
    });
  });
});

describe("buildReminderWhere — channel", () => {
  // 1:N 模型下,channel 直接在 reminder 自身(快照),不再是 where.user.is.channel
  it("合法 channel → reminder.channel 直接设", () => {
    const r = buildReminderWhere({ channel: "bark" });
    expect(r.channel).toBe("bark");
  });
  it("4 个 channel 都能正常处理", () => {
    for (const ch of ["serverchan", "bark", "pushplus", "telegram"]) {
      expect(buildReminderWhere({ channel: ch }).channel).toBe(ch);
    }
  });
  it("非法 channel → 忽略(不设 channel)", () => {
    expect(buildReminderWhere({ channel: "wechat" }).channel).toBeUndefined();
    expect(buildReminderWhere({ channel: "" }).channel).toBeUndefined();
  });
});

describe("buildReminderWhere — bound", () => {
  it("bound=yes → user.isNot = null", () => {
    const r = buildReminderWhere({ bound: "yes" });
    expect(r.user).toEqual({ isNot: null });
  });
  it("bound=no → user.is = null", () => {
    const r = buildReminderWhere({ bound: "no" });
    expect(r.user).toEqual({ is: null });
  });
  it("bound 是其他值 → 忽略", () => {
    expect(buildReminderWhere({ bound: "maybe" }).user).toBeUndefined();
    expect(buildReminderWhere({ bound: "" }).user).toBeUndefined();
  });
});

describe("buildReminderWhere — channel + bound 组合", () => {
  it("channel 与 bound=yes 同时设 → 两个都生效", () => {
    const r = buildReminderWhere({ channel: "bark", bound: "yes" });
    expect(r.channel).toBe("bark");
    expect(r.user).toEqual({ isNot: null });
  });
  it("只设 bound=yes → user.isNot = null", () => {
    expect(buildReminderWhere({ bound: "yes" }).user).toEqual({ isNot: null });
  });
  it("channel 与 bound=no 语义矛盾(channel 必须有 user)→ 让 Prisma 自然返回空集", () => {
    // { channel: "bark" } 与 { user: { is: null } } 矛盾
    // 实现选择: 两个都保留,Prisma 自然返回空集(AND 不满足)
    const r = buildReminderWhere({ channel: "bark", bound: "no" });
    expect(r.channel).toBe("bark");
    expect(r.user).toEqual({ is: null });
  });
});

describe("buildReminderWhere — 综合场景", () => {
  it("典型 admin 排查: '昨天 Bark 失败的提醒'", () => {
    const r = buildReminderWhere({
      channel: "bark",
      status: "failed",
      from: "2026-07-12",
      to: "2026-07-12",
    });
    // 1:N - channel 在 reminder 自身
    expect(r.channel).toBe("bark");
    expect(r.status).toBe("failed");
    const range = r.sentAt as { gte?: Date; lt?: Date } | undefined;
    expect(range?.gte).toEqual(new Date("2026-07-12T00:00:00Z"));
    expect(range?.lt).toEqual(new Date("2026-07-13T00:00:00Z"));
  });
  it("手机号搜 + 日期范围 + 已绑筛选", () => {
    const r = buildReminderWhere({
      q: "215611",
      bound: "yes",
      from: "2026-07-01",
    });
    expect(r.sim).toEqual({ phoneNumber: { contains: "215611" } });
    expect(r.user).toEqual({ isNot: null });
    const range = r.sentAt as { gte?: Date; lt?: Date } | undefined;
    expect(range?.gte).toEqual(new Date("2026-07-01T00:00:00Z"));
  });
});

describe("hasAnyReminderFilter", () => {
  it("全空 → false", () => {
    expect(hasAnyReminderFilter({})).toBe(false);
  });
  it("只设 page 风格参数(空对象) → false", () => {
    expect(
      hasAnyReminderFilter({ q: "", status: "", channel: "", bound: "", from: "", to: "" })
    ).toBe(false);
  });
  it("任意单个维度非空 → true", () => {
    expect(hasAnyReminderFilter({ simId: "1" })).toBe(true);
    expect(hasAnyReminderFilter({ userId: "1" })).toBe(true);
    expect(hasAnyReminderFilter({ q: "abc" })).toBe(true);
    expect(hasAnyReminderFilter({ status: "failed" })).toBe(true);
    expect(hasAnyReminderFilter({ channel: "bark" })).toBe(true);
    expect(hasAnyReminderFilter({ bound: "yes" })).toBe(true);
    expect(hasAnyReminderFilter({ from: "2026-07-01" })).toBe(true);
    expect(hasAnyReminderFilter({ to: "2026-07-12" })).toBe(true);
  });
  it("多个维度同时 → true", () => {
    expect(
      hasAnyReminderFilter({ channel: "bark", status: "failed", from: "2026-07-12" })
    ).toBe(true);
  });
});

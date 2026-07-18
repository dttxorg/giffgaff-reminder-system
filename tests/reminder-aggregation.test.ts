import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  simFindMany: vi.fn(),
  settingFindUnique: vi.fn(),
  reminderFindMany: vi.fn(),
  reminderCreate: vi.fn(),
  reminderUpdate: vi.fn(),
  sendPush: vi.fn(),
  ensureSimPortToken: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    sim: { findMany: mocks.simFindMany },
    setting: { findUnique: mocks.settingFindUnique },
    reminderSent: {
      findMany: mocks.reminderFindMany,
      create: mocks.reminderCreate,
      update: mocks.reminderUpdate,
    },
  },
}));
vi.mock("../lib/channels", () => ({ sendPush: mocks.sendPush }));
vi.mock("../lib/port-token-db", () => ({
  ensureSimPortToken: mocks.ensureSimPortToken,
}));

import { runReminderScan } from "../lib/reminder";

const now = new Date("2026-07-15T04:00:00.000Z"); // 上海 12:00
const dueBaseline = new Date("2026-01-21T04:00:00.000Z"); // 175 天
const urgentBaseline = new Date("2026-01-16T04:00:00.000Z"); // 180 天
const safeBaseline = new Date("2026-04-06T04:00:00.000Z"); // 100 天

function sim(
  id: number,
  userId: number,
  options: { due?: boolean; urgent?: boolean; channelKey?: string } = {}
) {
  return {
    id,
    userId,
    phoneNumber: `0772400000${id}`,
    activatedAt:
      options.due === false
        ? safeBaseline
        : options.urgent
          ? urgentBaseline
          : dueBaseline,
    lastPortedAt: null,
    portToken: `token-${id}`,
    channel: "serverchan",
    channelKey: options.channelKey ?? `key-${id}`,
  };
}

describe("多号码账号汇总提醒", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.settingFindUnique.mockResolvedValue(null);
    mocks.reminderFindMany.mockResolvedValue([]);
    mocks.reminderCreate.mockResolvedValue({ id: 99 });
    mocks.reminderUpdate.mockResolvedValue({});
    mocks.sendPush.mockResolvedValue({ ok: true });
  });

  it("4 张活跃号码合并推送，频率由最接近保号日的号码决定", async () => {
    mocks.simFindMany.mockResolvedValue([
      sim(1, 10),
      sim(2, 10, { urgent: true }),
      sim(3, 10),
      sim(4, 10),
    ]);

    const result = await runReminderScan({
      baseUrl: "https://baohao.example",
      now,
    });

    expect(mocks.sendPush).toHaveBeenCalledOnce();
    expect(mocks.sendPush).toHaveBeenCalledWith(
      "serverchan",
      "key-1",
      expect.stringContaining("4 个号码"),
      expect.stringMatching(/尾号 0001[\s\S]*https:\/\/baohao\.example\/me/)
    );
    expect(mocks.ensureSimPortToken).not.toHaveBeenCalled();
    expect(mocks.reminderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 10,
        simId: 1,
        aggregateDay: "2026-07-15",
        aggregateSimCount: 4,
        dayOffset: 180,
        bucket: 5,
        status: "failed",
      }),
      select: { id: true },
    });
    expect(mocks.reminderUpdate).toHaveBeenCalledWith({
      where: { id: 99 },
      data: {
        status: "success",
        errorMessage: null,
        sentAt: now,
      },
    });
    expect(result).toMatchObject({
      processed: 4,
      sent: 1,
      skipped: 0,
      failed: 0,
    });
    expect(result.details[0].aggregateSimIds).toEqual([1, 2, 3, 4]);
  });

  it("同一紧急度 bucket 已有汇总记录时整组跳过", async () => {
    mocks.simFindMany.mockResolvedValue([
      sim(1, 10),
      sim(2, 10),
      sim(3, 10),
      sim(4, 10),
    ]);
    mocks.reminderFindMany.mockResolvedValue([
      {
        simId: 1,
        userId: 10,
        dayOffset: 175,
        bucket: 1,
        aggregateDay: "2026-07-15",
      },
    ]);

    const result = await runReminderScan({
      baseUrl: "https://baohao.example",
      now,
    });

    expect(mocks.sendPush).not.toHaveBeenCalled();
    expect(mocks.reminderCreate).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(4);
  });

  it("最紧急号码进入下一个 bucket 后允许发送下一条汇总", async () => {
    mocks.simFindMany.mockResolvedValue([
      sim(1, 10),
      sim(2, 10, { urgent: true }),
      sim(3, 10),
      sim(4, 10),
    ]);
    mocks.reminderFindMany.mockResolvedValue([
      {
        simId: 1,
        userId: 10,
        dayOffset: 180,
        bucket: 4,
        aggregateDay: "2026-07-15",
      },
    ]);

    const result = await runReminderScan({
      baseUrl: "https://baohao.example",
      now,
    });

    expect(mocks.sendPush).toHaveBeenCalledOnce();
    expect(mocks.reminderCreate.mock.calls[0][0].data).toMatchObject({
      dayOffset: 180,
      bucket: 5,
    });
    expect(result.sent).toBe(1);
  });

  it("账号 4 张卡但仅一张进入窗口时仍走账号汇总", async () => {
    mocks.simFindMany.mockResolvedValue([
      sim(1, 10),
      sim(2, 10, { due: false }),
      sim(3, 10, { due: false }),
      sim(4, 10, { due: false }),
    ]);

    const result = await runReminderScan({
      baseUrl: "https://baohao.example",
      now,
    });

    expect(mocks.sendPush).toHaveBeenCalledOnce();
    expect(mocks.sendPush.mock.calls[0][2]).toContain("1 个号码");
    expect(result.sent).toBe(1);
  });

  it("账号恰好 3 张卡时保持逐号码提醒", async () => {
    mocks.simFindMany.mockResolvedValue([
      sim(1, 10),
      sim(2, 10),
      sim(3, 10),
    ]);

    const result = await runReminderScan({
      baseUrl: "https://baohao.example",
      now,
    });

    expect(mocks.sendPush).toHaveBeenCalledTimes(3);
    expect(mocks.reminderCreate).toHaveBeenCalledTimes(3);
    expect(mocks.reminderUpdate).not.toHaveBeenCalled();
    expect(result.sent).toBe(3);
  });

  it("主卡未配置渠道时选择账号内第一张已配置渠道的卡", async () => {
    mocks.simFindMany.mockResolvedValue([
      sim(1, 10, { channelKey: "" }),
      sim(2, 10, { channelKey: "account-key" }),
      sim(3, 10),
      sim(4, 10),
    ]);

    await runReminderScan({ baseUrl: "https://baohao.example", now });

    expect(mocks.sendPush.mock.calls[0][1]).toBe("account-key");
    expect(mocks.reminderCreate.mock.calls[0][0].data.simId).toBe(2);
  });

  it("并发任务未取得每日占位时跳过外部推送", async () => {
    mocks.simFindMany.mockResolvedValue([
      sim(1, 10),
      sim(2, 10),
      sim(3, 10),
      sim(4, 10),
    ]);
    mocks.reminderCreate.mockRejectedValue(new Error("unique conflict"));

    const result = await runReminderScan({
      baseUrl: "https://baohao.example",
      now,
    });

    expect(mocks.sendPush).not.toHaveBeenCalled();
    expect(result.skipped).toBe(4);
  });
});

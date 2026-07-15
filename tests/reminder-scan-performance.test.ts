import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  simFindMany: vi.fn(),
  settingFindUnique: vi.fn(),
  reminderFindMany: vi.fn(),
  reminderCreate: vi.fn(),
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
    },
  },
}));

vi.mock("../lib/channels", () => ({
  sendPush: mocks.sendPush,
}));

vi.mock("../lib/port-token-db", () => ({
  ensureSimPortToken: mocks.ensureSimPortToken,
}));

import { runReminderScan } from "../lib/reminder";

const now = new Date("2026-07-15T04:00:00.000Z");
const baseline = new Date("2026-01-21T04:00:00.000Z");

function sim(id: number, portToken: string | null) {
  return {
    id,
    userId: id,
    phoneNumber: `0772400000${id}`,
    activatedAt: baseline,
    lastPortedAt: null,
    portToken,
    channel: "serverchan",
    channelKey: `key-${id}`,
  };
}

describe("runReminderScan query budget", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("所有候选共用一次幂等查询，不再逐 SIM findUnique", async () => {
    mocks.simFindMany.mockResolvedValueOnce([
      sim(1, "token-1"),
      sim(2, "token-2"),
      sim(3, null),
    ]);
    mocks.settingFindUnique.mockResolvedValueOnce(null);
    mocks.reminderFindMany.mockResolvedValueOnce([
      { simId: 1, dayOffset: 175, bucket: 1 },
    ]);
    mocks.ensureSimPortToken.mockResolvedValueOnce("token-3");
    mocks.sendPush.mockResolvedValue({ ok: true });
    mocks.reminderCreate.mockResolvedValue({});

    const result = await runReminderScan({
      baseUrl: "https://example.com",
      now,
    });

    expect(mocks.simFindMany).toHaveBeenCalledOnce();
    expect(mocks.settingFindUnique).toHaveBeenCalledOnce();
    expect(mocks.reminderFindMany).toHaveBeenCalledOnce();
    expect(mocks.reminderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: expect.arrayContaining([expect.objectContaining({ simId: 1 })]) },
      })
    );
    expect(mocks.ensureSimPortToken).toHaveBeenCalledWith(3, null);
    expect(mocks.sendPush).toHaveBeenCalledTimes(2);
    expect(mocks.reminderCreate).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ processed: 3, sent: 2, skipped: 1, failed: 0 });
  });
});

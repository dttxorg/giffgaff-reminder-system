import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  transaction: vi.fn(),
  simFindFirst: vi.fn(),
  simDelete: vi.fn(),
  simCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userUpdateMany: vi.fn(),
  invalidatePublicSimCache: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
  getCurrentUserSessionId: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("../lib/public-sim-cache", () => ({
  invalidatePublicSimCache: mocks.invalidatePublicSimCache,
}));

vi.mock("../lib/user-sim-writes", () => ({
  updateCurrentUserSimActivatedAt: vi.fn(),
  updateCurrentUserSimDetails: vi.fn(),
}));

import { DELETE, POST } from "../app/api/me/sim/route";

function request(method: string, body: unknown) {
  return new Request("http://localhost/api/me/sim", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("删除号码后保留提醒名额与通知渠道", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getCurrentUserId.mockResolvedValue(7);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        sim: {
          findFirst: mocks.simFindFirst,
          delete: mocks.simDelete,
          create: mocks.simCreate,
        },
        user: {
          findUnique: mocks.userFindUnique,
          update: mocks.userUpdate,
          updateMany: mocks.userUpdateMany,
        },
      })
    );
  });

  it("移除号码时保存渠道并增加一个保留名额", async () => {
    mocks.simFindFirst.mockResolvedValue({
      id: 23,
      portToken: "public-token",
      channel: "bark",
      channelKey: "https://api.day.app/example",
    });
    mocks.userUpdate.mockResolvedValue({});
    mocks.simDelete.mockResolvedValue({});

    const response = await DELETE(request("DELETE", { simId: 23 }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.retainedSlot).toBe(true);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        availableReminderSlots: { increment: 1 },
        defaultChannel: "bark",
        defaultChannelKey: "https://api.day.app/example",
      },
    });
    expect(mocks.simDelete).toHaveBeenCalledWith({ where: { id: 23 } });
    expect(mocks.invalidatePublicSimCache).toHaveBeenCalledWith(
      expect.objectContaining({ id: 23 })
    );
  });

  it("用保留名额填写新号码时沿用渠道并消耗一个名额", async () => {
    mocks.userFindUnique.mockResolvedValue({
      availableReminderSlots: 1,
      defaultChannel: "telegram",
      defaultChannelKey: "bot|chat",
    });
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
    mocks.simCreate.mockResolvedValue({ id: 88 });

    const response = await POST(
      request("POST", {
        phoneNumber: "07400123456",
        activatedAt: "2026-07-01",
        carrier: "ctexcel",
        reminderStartDay: 76,
        cycleDays: 88,
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, simId: 88 });
    expect(mocks.userUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, availableReminderSlots: { gt: 0 } },
      data: { availableReminderSlots: { decrement: 1 } },
    });
    expect(mocks.simCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phoneNumber: "07400123456",
        carrier: "ctexcel",
        reminderStartDay: 76,
        cycleDays: 88,
        channel: "telegram",
        channelKey: "bot|chat",
        userId: 7,
      }),
      select: { id: true },
    });
  });

  it("没有保留名额时不创建号码", async () => {
    mocks.userFindUnique.mockResolvedValue({
      availableReminderSlots: 0,
      defaultChannel: "serverchan",
      defaultChannelKey: "",
    });

    const response = await POST(
      request("POST", {
        phoneNumber: "07400123456",
        activatedAt: "2026-07-01",
        carrier: "giffgaff",
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.simCreate).not.toHaveBeenCalled();
  });
});

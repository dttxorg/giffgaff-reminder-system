import { describe, expect, it, vi } from "vitest";
import { redeemCard } from "../lib/redeem";

function createDb(claimedCount: number) {
  const cardUpdateMany = vi.fn().mockResolvedValue({ count: claimedCount });
  const simCreate = vi.fn().mockResolvedValue({ id: 42 });
  const cardUpdate = vi.fn().mockResolvedValue({});
  const db = {
    cardKey: {
      findUnique: vi.fn().mockResolvedValue({
        id: 7,
        used: false,
        expiresAt: null,
      }),
      updateMany: cardUpdateMany,
      update: cardUpdate,
    },
    sim: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue({
        channel: "serverchan",
        channelKey: "SCT_TEST",
      }),
      create: simCreate,
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 9 }),
    },
  };
  return { db, cardUpdateMany, simCreate, cardUpdate };
}

const input = {
  rawCode: "23456789ABCDEFGH",
  phoneNumber: "07724215611",
  activatedAt: "2026-07-01",
};

describe("redeemCard 并发占用", () => {
  it("原子占用失败时不创建 SIM，也不覆盖已兑换卡密", async () => {
    const { db, simCreate, cardUpdate } = createDb(0);

    await expect(redeemCard(input, 9, db as never)).resolves.toEqual({
      ok: false,
      error: "ALREADY_USED",
    });
    expect(simCreate).not.toHaveBeenCalled();
    expect(cardUpdate).not.toHaveBeenCalled();
  });

  it("只有成功占用后才创建 SIM 并写入绑定关系", async () => {
    const { db, cardUpdateMany, simCreate, cardUpdate } = createDb(1);

    await expect(redeemCard(input, 9, db as never)).resolves.toMatchObject({
      ok: true,
      userId: 9,
      simId: 42,
      isNewUser: false,
    });
    expect(cardUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, used: false },
      data: { used: true, usedAt: expect.any(Date) },
    });
    expect(simCreate).toHaveBeenCalledOnce();
    expect(cardUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        used: true,
        usedAt: expect.any(Date),
        usedSimId: 42,
      },
    });
  });
});

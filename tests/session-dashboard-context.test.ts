import { describe, expect, it } from "vitest";
import { summarizeCurrentUserDashboardRows } from "../lib/session";

const base = {
  expiresAt: new Date("2026-07-20T00:00:00.000Z"),
  username: "alice",
  status: "active" as const,
  channel: "bark" as const,
  missingChannel: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  activePortToken: null,
  activeActivatedAt: null,
  activeLastPortedAt: null,
  activeChannelKey: null,
};

describe("summarizeCurrentUserDashboardRows", () => {
  it("保留全部摘要,只从标记行构造当前卡详情", () => {
    const result = summarizeCurrentUserDashboardRows([
      {
        ...base,
        simId: 1,
        phoneNumber: "07724000001",
        dayOffset: 100,
        isActive: false,
      },
      {
        ...base,
        simId: 2,
        phoneNumber: "07724000002",
        dayOffset: 181,
        isActive: true,
        activePortToken: "public-token",
        activeActivatedAt: new Date("2026-01-02T00:00:00.000Z"),
        activeChannelKey: "secret-key",
      },
    ]);

    expect(result?.sims).toHaveLength(2);
    expect(result?.sims[0]).not.toHaveProperty("channelKey");
    expect(result?.sims[0]).not.toHaveProperty("portToken");
    expect(result?.activeSim).toMatchObject({
      id: 2,
      portToken: "public-token",
      channelKey: "secret-key",
    });
  });

  it("无 SIM 的 LEFT JOIN 行仍返回账号上下文", () => {
    expect(
      summarizeCurrentUserDashboardRows([
        {
          ...base,
          simId: null,
          phoneNumber: null,
          status: null,
          channel: null,
          missingChannel: null,
          dayOffset: null,
          createdAt: null,
          isActive: null,
        },
      ])
    ).toEqual({
      username: "alice",
      availableReminderSlots: 0,
      sims: [],
      activeSim: null,
    });
  });
});

import { describe, expect, it } from "vitest";
import { summarizeCurrentUserSettingsRows } from "../lib/session";

const base = {
  expiresAt: new Date("2026-07-20T00:00:00.000Z"),
  username: "alice",
  selectedPortToken: null,
  selectedActivatedAt: null,
  selectedLastPortedAt: null,
  selectedChannel: null,
  selectedChannelKey: null,
};

describe("summarizeCurrentUserSettingsRows", () => {
  it("所有卡只保留选择器摘要,当前卡获得完整表单详情", () => {
    const result = summarizeCurrentUserSettingsRows([
      {
        ...base,
        simId: 1,
        phoneNumber: "07724000001",
        isSelected: false,
      },
      {
        ...base,
        simId: 2,
        phoneNumber: "07724000002",
        isSelected: true,
        selectedPortToken: "public-token",
        selectedActivatedAt: new Date("2026-01-02T00:00:00.000Z"),
        selectedChannel: "bark" as const,
        selectedChannelKey: "secret-key",
      },
    ]);

    expect(result?.sims).toEqual([
      { id: 1, phoneNumber: "07724000001" },
      { id: 2, phoneNumber: "07724000002" },
    ]);
    expect(result?.sims[0]).not.toHaveProperty("channelKey");
    expect(result?.selectedSim).toMatchObject({
      id: 2,
      portToken: "public-token",
      channel: "bark",
      channelKey: "secret-key",
    });
  });

  it("无 SIM 时返回空选择器上下文", () => {
    expect(
      summarizeCurrentUserSettingsRows([
        {
          ...base,
          simId: null,
          phoneNumber: null,
          isSelected: null,
        },
      ])
    ).toEqual({ username: "alice", sims: [], selectedSim: null });
  });
});

import { describe, expect, it } from "vitest";
import {
  buildAccountReminderMessage,
  buildAccountReminderResendMessage,
  MULTI_SIM_AGGREGATE_THRESHOLD,
} from "../lib/account-reminder";

describe("账号汇总提醒文案", () => {
  it("4 张起启用汇总策略且只展示尾号和后台入口", () => {
    expect(MULTI_SIM_AGGREGATE_THRESHOLD).toBe(3);
    const message = buildAccountReminderMessage(
      [
        { id: 1, phoneNumber: "07724215611", dayOffset: 175 },
        { id: 2, phoneNumber: "07724210002", dayOffset: 180 },
        { id: 3, phoneNumber: "07724210003", dayOffset: 172 },
        { id: 4, phoneNumber: "07724210004", dayOffset: 178 },
      ],
      "https://baohao.example/"
    );

    expect(message.title).toContain("4 个号码");
    expect(message.body).toContain("尾号 5611");
    expect(message.body).not.toContain("07724215611");
    expect(message.body).toContain("今天只发送这一条汇总提醒");
    expect(message.body).toContain("https://baohao.example/me");
    expect(message.body).not.toContain("/p/");
  });

  it("大量号码只列前 10 个并提示剩余数量", () => {
    const items = Array.from({ length: 14 }, (_, index) => ({
      id: index + 1,
      phoneNumber: `0772400${String(index).padStart(4, "0")}`,
      dayOffset: 180 - (index % 4),
    }));
    const message = buildAccountReminderMessage(items, "https://baohao.example");

    expect(message.body.match(/^• 尾号/gm)).toHaveLength(10);
    expect(message.body).toContain("另有 4 个号码");
  });

  it("历史汇总重发只带计数与后台入口", () => {
    const message = buildAccountReminderResendMessage(
      6,
      "https://baohao.example"
    );
    expect(message.title).toContain("6 个号码");
    expect(message.body).toContain("https://baohao.example/me");
  });
});

import { describe, it, expect } from "vitest";
import { formatTimeGap } from "../lib/date";

describe("formatTimeGap", () => {
  const now = new Date("2026-07-12T00:00:00Z");
  it("同日 → 今天", () => {
    const d = new Date("2026-07-12T00:00:00Z");
    expect(formatTimeGap(d, now)).toBe("今天");
  });
  it("昨天 → 昨天", () => {
    const d = new Date("2026-07-11T00:00:00Z");
    expect(formatTimeGap(d, now)).toBe("昨天");
  });
  it("3 天前 → 3 天前", () => {
    const d = new Date("2026-07-09T00:00:00Z");
    expect(formatTimeGap(d, now)).toBe("3 天前");
  });
  it("7 天前 → 7 天前", () => {
    const d = new Date("2026-07-05T00:00:00Z");
    expect(formatTimeGap(d, now)).toBe("7 天前");
  });
  it("未来时间(数据异常) → 仍然 '今天'", () => {
    const d = new Date("2026-07-20T00:00:00Z");
    expect(formatTimeGap(d, now)).toBe("今天");
  });
});

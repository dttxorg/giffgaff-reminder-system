import { describe, it, expect } from "vitest";
import {
  bucketForDay,
  dayOffsetFromBaseline,
  isInReminderWindow,
  nextBucketAt,
  shanghaiParts,
  timeUntilNextBucket,
} from "../lib/bucket";

describe("bucketForDay", () => {
  it("返回 null 当 dayOffset 不在 170-180 范围", () => {
    expect(bucketForDay(0, 12)).toBeNull();
    expect(bucketForDay(169, 12)).toBeNull();
    expect(bucketForDay(181, 12)).toBeNull();
    expect(bucketForDay(-1, 12)).toBeNull();
  });

  it("170-172 每天 1 次,bucket 始终 0", () => {
    for (let d = 170; d <= 172; d++) {
      for (let h = 0; h < 24; h++) {
        expect(bucketForDay(d, h)).toEqual({ count: 1, bucket: 0 });
      }
    }
  });

  it("173-175 每天 2 次,2 个等长 12h 窗口", () => {
    for (const d of [173, 174, 175]) {
      expect(bucketForDay(d, 0)).toEqual({ count: 2, bucket: 0 });
      expect(bucketForDay(d, 11)).toEqual({ count: 2, bucket: 0 });
      expect(bucketForDay(d, 12)).toEqual({ count: 2, bucket: 1 });
      expect(bucketForDay(d, 23)).toEqual({ count: 2, bucket: 1 });
    }
  });

  it("176-178 每天 3 次,3 个等长 8h 窗口", () => {
    for (const d of [176, 177, 178]) {
      expect(bucketForDay(d, 0)).toEqual({ count: 3, bucket: 0 });
      expect(bucketForDay(d, 7)).toEqual({ count: 3, bucket: 0 });
      expect(bucketForDay(d, 8)).toEqual({ count: 3, bucket: 1 });
      expect(bucketForDay(d, 15)).toEqual({ count: 3, bucket: 1 });
      expect(bucketForDay(d, 16)).toEqual({ count: 3, bucket: 2 });
      expect(bucketForDay(d, 23)).toEqual({ count: 3, bucket: 2 });
    }
  });

  it("179 每天 5 次,5 个等长 4.8h 窗口", () => {
    expect(bucketForDay(179, 0)).toEqual({ count: 5, bucket: 0 });
    expect(bucketForDay(179, 4)).toEqual({ count: 5, bucket: 0 });
    expect(bucketForDay(179, 5)).toEqual({ count: 5, bucket: 1 });
    expect(bucketForDay(179, 9)).toEqual({ count: 5, bucket: 1 });
    expect(bucketForDay(179, 14)).toEqual({ count: 5, bucket: 2 });
    expect(bucketForDay(179, 19)).toEqual({ count: 5, bucket: 3 });
    expect(bucketForDay(179, 23)).toEqual({ count: 5, bucket: 4 });
  });

  it("180 每天 10 次,10 个等长 2.4h 窗口", () => {
    expect(bucketForDay(180, 0)).toEqual({ count: 10, bucket: 0 });
    expect(bucketForDay(180, 2)).toEqual({ count: 10, bucket: 0 });
    expect(bucketForDay(180, 3)).toEqual({ count: 10, bucket: 1 });
    expect(bucketForDay(180, 9)).toEqual({ count: 10, bucket: 3 });
    expect(bucketForDay(180, 23)).toEqual({ count: 10, bucket: 9 });
  });

  it("无效 hourOfDay 返回 null", () => {
    expect(bucketForDay(170, -1)).toBeNull();
    expect(bucketForDay(170, 24)).toBeNull();
  });
});

describe("dayOffsetFromBaseline", () => {
  it("返回正确的天数差", () => {
    const baseline = new Date("2026-01-15T00:00:00Z");
    const now = new Date("2026-01-25T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(10);
  });

  it("now < baseline 返回负数", () => {
    const baseline = new Date("2026-01-25T00:00:00Z");
    const now = new Date("2026-01-15T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(-10);
  });

  it("跨年计算", () => {
    const baseline = new Date("2025-12-30T00:00:00Z");
    const now = new Date("2026-01-05T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(6);
  });

  // ===== 关键回归测试:Vercel 跑在 UTC,业务按 Asia/Shanghai 解读日期 =====
  // 这些 case 在 UTC 算法下会差 1 天(用户之前感知到的 bug)

  it("北京时间凌晨:now=2026-06-22 01:00 BJ 应解读为 6-22,不是 UTC 的 6-21", () => {
    // 2026-06-21T17:00:00Z = 北京时间 2026-06-22 01:00
    const now = new Date("2026-06-21T17:00:00Z");
    const baseline = new Date("2026-06-22T00:00:00Z"); // 北京 2026-06-22 08:00
    expect(dayOffsetFromBaseline(baseline, now)).toBe(0);
  });

  it("跨时区 24h 内仍按上海 ymd 算:now 是 baseline 的前一天 23:30 BJ", () => {
    // baseline = 北京 2026-06-23 00:00 (= UTC 2026-06-22 16:00)
    const baseline = new Date("2026-06-22T16:00:00Z");
    // now = 北京 2026-06-22 23:30 (= UTC 2026-06-22 15:30)
    const now = new Date("2026-06-22T15:30:00Z");
    // UTC 算法会算成 diff=0(同一天),上海算法应该返回 -1(baseline 是明天)
    expect(dayOffsetFromBaseline(baseline, now)).toBe(-1);
  });

  it("北京时间 0-8 点不应算成 UTC 的前一天", () => {
    // baseline = 北京 2026-01-15 = UTC 2026-01-15 00:00
    const baseline = new Date("2026-01-15T00:00:00Z");
    // now = 北京 2026-06-22 01:00 = UTC 2026-06-21 17:00
    const now = new Date("2026-06-21T17:00:00Z");
    // UTC 算法 → 157 天(把 now 当 6-21)
    // 上海算法 → 158 天(now 是 6-22)
    expect(dayOffsetFromBaseline(baseline, now)).toBe(158);
  });
});

describe("shanghaiParts", () => {
  it("UTC 时间正确转为上海 ymdh", () => {
    // 2026-06-21T18:47:19Z = 北京 2026-06-22 02:47:19
    const d = new Date("2026-06-21T18:47:19Z");
    expect(shanghaiParts(d)).toEqual({
      year: 2026,
      month: 6,
      day: 22,
      hour: 2,
      minute: 47,
      second: 19,
    });
  });

  it("midnight 必须返回 hour=0,不是 24", () => {
    // 2026-06-21T16:00:00Z = 北京 2026-06-22 00:00:00
    const d = new Date("2026-06-21T16:00:00Z");
    const p = shanghaiParts(d);
    expect(p.hour).toBe(0);
    expect(p.day).toBe(22);
  });
});

describe("isInReminderWindow", () => {
  it("在窗口内", () => {
    expect(isInReminderWindow(170)).toBe(true);
    expect(isInReminderWindow(175)).toBe(true);
    expect(isInReminderWindow(180)).toBe(true);
  });
  it("在窗口外", () => {
    expect(isInReminderWindow(0)).toBe(false);
    expect(isInReminderWindow(169)).toBe(false);
    expect(isInReminderWindow(181)).toBe(false);
  });
});


describe("nextBucketAt", () => {
  it("不在提醒窗口 (dayOffset < 170) → null", () => {
    expect(nextBucketAt(169, 10)).toBeNull();
    expect(nextBucketAt(100, 23)).toBeNull();
  });

  it("dayOffset=180 (10 buckets) → 每 2.4h 一个", () => {
    // 0-2 时 → bucket 0 → 下一个 bucket 1 开始 = 2.4h → "02:00" (floor 2.4 = 2)
    expect(nextBucketAt(180, 0)).toBe("02:00");
    expect(nextBucketAt(180, 5)).toBe("07:00");
    expect(nextBucketAt(180, 20)).toBe("21:00");
  });

  it("dayOffset=170 (1 bucket) → 整天一个,次日凌晨开始下一轮", () => {
    // 0-23 时都返回 "00:00" (明天)
    expect(nextBucketAt(170, 10)).toBe("00:00");
    expect(nextBucketAt(170, 23)).toBe("00:00");
  });

  it("dayOffset=175 (2 buckets) → 12h 间隔", () => {
    // 0-11 → bucket 0 → 下一个 = bucket 1 @ 12:00
    expect(nextBucketAt(175, 0)).toBe("12:00");
    expect(nextBucketAt(175, 11)).toBe("12:00");
    // 12-23 → bucket 1 → 下一个 = 明天 0:00
    expect(nextBucketAt(175, 12)).toBe("00:00");
    expect(nextBucketAt(175, 20)).toBe("00:00");
  });

  it("dayOffset=178 (3 buckets) → 8h 间隔", () => {
    // 0-7 → bucket 0 → next = bucket 1 @ 08:00
    expect(nextBucketAt(178, 3)).toBe("08:00");
    // 8-15 → bucket 1 → next = bucket 2 @ 16:00
    expect(nextBucketAt(178, 10)).toBe("16:00");
    // 16-23 → bucket 2 → next = 明天 0:00
    expect(nextBucketAt(178, 20)).toBe("00:00");
  });
});

describe("timeUntilNextBucket", () => {
  const baseDate = new Date(2026, 6, 13, 10, 30); // 7月13日 10:30

  it("3 小时 30 分后", () => {
    // baseDate = 10:30, target = 14:00, diff = 3h30m
    expect(timeUntilNextBucket(baseDate, "14:00")).toBe("3 小时 30 分后");
  });

  it("整小时(无余分钟)", () => {
    expect(timeUntilNextBucket(baseDate, "13:00")).toBe("2 小时 30 分后");
    expect(timeUntilNextBucket(baseDate, "12:00")).toBe("1 小时 30 分后");
  });

  it("不足 1 小时 → 只显示分钟", () => {
    expect(timeUntilNextBucket(baseDate, "11:00")).toBe("30 分后");
    expect(timeUntilNextBucket(baseDate, "10:50")).toBe("20 分后");
  });

  it("0 分钟差(同一时刻)→ 视为明天 24h 后", () => {
    expect(timeUntilNextBucket(baseDate, "10:30")).toBe("24 小时后");
  });

  it("过去时间(差为负)→ 视为明天(24h + 差)", () => {
    // 10:30 → 10:00(已过) → -30m + 24h = 23h30m
    expect(timeUntilNextBucket(baseDate, "10:00")).toBe("23 小时 30 分后");
    // 10:30 → 00:00(已过) → -10:30 + 24h = 13h30m
    expect(timeUntilNextBucket(baseDate, "00:00")).toBe("13 小时 30 分后");
  });

  it("跨 24h 仍能正确算", () => {
    // 现在 23:00, nextBucket 02:00 (明天 2 点) → 3 小时后
    const lateNight = new Date(2026, 6, 13, 23, 0);
    expect(timeUntilNextBucket(lateNight, "02:00")).toBe("3 小时后");
  });
});

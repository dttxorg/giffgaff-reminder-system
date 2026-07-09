import { describe, it, expect } from "vitest";
import { progressFor } from "../app/me/_components/day-offset-progress";

describe("progressFor", () => {
  it("dayOffset < 170 → 静默期,0 次推送", () => {
    expect(progressFor(0)).toMatchObject({ label: "静默期", bucketCount: 0 });
    expect(progressFor(100)).toMatchObject({ label: "静默期", bucketCount: 0 });
    expect(progressFor(169)).toMatchObject({ label: "静默期", bucketCount: 0 });
  });

  it("170-172 → 轻度提醒,1 次/天,百分比 25-50%", () => {
    expect(progressFor(170)).toMatchObject({ label: "轻度提醒", bucketCount: 1 });
    expect(progressFor(171).pct).toBeGreaterThanOrEqual(25);
    expect(progressFor(171).pct).toBeLessThanOrEqual(50);
    expect(progressFor(172)).toMatchObject({ label: "轻度提醒", bucketCount: 1 });
  });

  it("173-175 → 中度提醒,2 次/天", () => {
    expect(progressFor(173)).toMatchObject({ label: "中度提醒", bucketCount: 2 });
    expect(progressFor(174)).toMatchObject({ label: "中度提醒", bucketCount: 2 });
    expect(progressFor(175)).toMatchObject({ label: "中度提醒", bucketCount: 2 });
  });

  it("176-178 → 高度提醒,3 次/天", () => {
    expect(progressFor(176)).toMatchObject({ label: "高度提醒", bucketCount: 3 });
    expect(progressFor(177)).toMatchObject({ label: "高度提醒", bucketCount: 3 });
    expect(progressFor(178)).toMatchObject({ label: "高度提醒", bucketCount: 3 });
  });

  it("179 → 临近截止,5 次/天", () => {
    expect(progressFor(179)).toMatchObject({ label: "临近截止", bucketCount: 5 });
  });

  it("180 → 最后一天,10 次/天,pct=100", () => {
    const r = progressFor(180);
    expect(r.label).toBe("最后一天");
    expect(r.bucketCount).toBe(10);
    expect(r.pct).toBe(100);
  });

  it(">180 → 已过期", () => {
    expect(progressFor(181).label).toBe("已过期");
    expect(progressFor(365).label).toBe("已过期");
  });

  it("pct 始终在 0-100 范围内", () => {
    for (let d = 0; d <= 365; d++) {
      expect(progressFor(d).pct).toBeGreaterThanOrEqual(0);
      expect(progressFor(d).pct).toBeLessThanOrEqual(100);
    }
  });
});

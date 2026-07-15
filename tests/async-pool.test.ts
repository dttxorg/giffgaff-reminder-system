import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../lib/async-pool";

describe("mapWithConcurrency", () => {
  it("限制同时运行数量并保持输入顺序", async () => {
    let active = 0;
    let maxActive = 0;
    const result = await mapWithConcurrency(
      [1, 2, 3, 4, 5, 6, 7],
      3,
      async (value) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return value * 10;
      }
    );

    expect(maxActive).toBe(3);
    expect(result).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  it("空输入不调用 worker", async () => {
    let calls = 0;
    const result = await mapWithConcurrency([], 5, async () => {
      calls += 1;
      return true;
    });

    expect(result).toEqual([]);
    expect(calls).toBe(0);
  });
});

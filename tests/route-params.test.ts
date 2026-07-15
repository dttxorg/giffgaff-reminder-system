import { describe, expect, it } from "vitest";
import { parsePositiveIntParam } from "../lib/route-params";

describe("parsePositiveIntParam", () => {
  it("只接受完整、安全的正整数", () => {
    expect(parsePositiveIntParam("1")).toBe(1);
    expect(parsePositiveIntParam("42")).toBe(42);
  });

  it("拒绝前缀匹配、零、负数、小数和超大整数", () => {
    for (const value of [
      "12abc",
      "0",
      "-1",
      "1.5",
      " 12",
      "9007199254740992",
    ]) {
      expect(parsePositiveIntParam(value)).toBeNull();
    }
  });
});

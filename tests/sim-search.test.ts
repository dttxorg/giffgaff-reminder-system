import { describe, it, expect } from "vitest";
import { filterSimsByQuery } from "../lib/sim-search";
import type { SimSearchItem } from "../lib/sim-search";

const sims: SimSearchItem[] = [
  { phoneNumber: "07724215611" },
  { phoneNumber: "07724123456" },
  { phoneNumber: "07724999999" },
  { phoneNumber: "13800138000" },
];

describe("filterSimsByQuery", () => {
  it("空查询 → 返回所有", () => {
    expect(filterSimsByQuery(sims, "")).toEqual(sims);
  });
  it("纯空格 → 返回所有(trim)", () => {
    expect(filterSimsByQuery(sims, "   ")).toEqual(sims);
  });

  it("全号匹配", () => {
    expect(filterSimsByQuery(sims, "07724215611")).toEqual([sims[0]]);
  });
  it("全号子串匹配", () => {
    expect(filterSimsByQuery(sims, "42156")).toEqual([sims[0]]);
  });
  it("后 4 位匹配 — 关键 UX(用户记尾号)", () => {
    expect(filterSimsByQuery(sims, "5611")).toEqual([sims[0]]);
    expect(filterSimsByQuery(sims, "9999")).toEqual([sims[2]]);
  });
  it("后 4 位无匹配", () => {
    expect(filterSimsByQuery(sims, "0000")).toEqual([]);
  });

  it("带空格/横线也能匹配(用户友好)", () => {
    expect(filterSimsByQuery(sims, "07724 215 611")).toEqual([sims[0]]);
    expect(filterSimsByQuery(sims, "07724-215-611")).toEqual([sims[0]]);
    expect(filterSimsByQuery(sims, "  5611  ")).toEqual([sims[0]]);
  });

  it("大小写不敏感", () => {
    // phoneNumber 都是数字,大小写不影响
    expect(filterSimsByQuery(sims, "5611")).toEqual([sims[0]]);
  });

  it("多张卡同时匹配(同尾号 4 位,正常情况不该发生但要鲁棒)", () => {
    const dup = [
      { phoneNumber: "07724215611" },
      { phoneNumber: "13800215611" },
    ];
    expect(filterSimsByQuery(dup, "5611")).toEqual(dup);
  });

  it("不匹配时返回空数组", () => {
    expect(filterSimsByQuery(sims, "0000000")).toEqual([]);
  });

  it("空 sims 数组 → 返回空", () => {
    expect(filterSimsByQuery([], "1234")).toEqual([]);
  });
});

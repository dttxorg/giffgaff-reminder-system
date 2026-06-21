import { describe, it, expect } from "vitest";
import { bucketForDay, dayOffsetFromBaseline } from "../lib/bucket";
import { toLookupKey, formatPhoneForDisplay } from "../lib/phone";
import { renderTemplate, portUrl } from "../lib/template";

// 可疑点 1:portUrl 在多个尾部斜杠 + 已有路径 的情况
describe("portUrl edge cases", () => {
  it("portUrl 已经包含 /p/<id> 时被覆盖", () => {
    expect(portUrl("https://example.com/p/1", 42)).toBe("https://example.com/p/1/p/42");
    // 这是 bug 还是设计?设计:baseUrl 应该是 origin,不是 path
  });
  it("portUrl 含 query string", () => {
    expect(portUrl("https://example.com?foo=bar", 42)).toBe("https://example.com?foo=bar/p/42");
    // 这是 bug
  });
  it("portUrl 不带协议", () => {
    expect(portUrl("example.com", 42)).toBe("example.com/p/42");
    // 取决于 cron route 是否传完整 URL
  });
});

// 可疑点 2:bucket 在 hourOfDay 浮点边界
describe("bucket float boundary", () => {
  it("180 天,hour=2 应在 bucket 0;hour=3 应在 bucket 1", () => {
    expect(bucketForDay(180, 2)!.bucket).toBe(0);
    expect(bucketForDay(180, 3)!.bucket).toBe(1);
  });
  it("180 天,hour=23 落在 bucket 9 (不是 10)", () => {
    // windowSize = 2.4
    // floor(23 / 2.4) = 9
    expect(bucketForDay(180, 23)!.bucket).toBe(9);
  });
});

// 可疑点 3:dayOffset 边界
describe("dayOffset boundary", () => {
  it("baseline = today,now = today → dayOffset = 0", () => {
    const d = new Date("2026-06-21T00:00:00Z");
    expect(dayOffsetFromBaseline(d, d)).toBe(0);
  });
  it("baseline = 169 天前,now = today → dayOffset = 169 (窗口前)", () => {
    const baseline = new Date("2026-06-21T00:00:00Z");
    const now = new Date("2026-12-07T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(169);
  });
  it("baseline = 170 天前 → dayOffset = 170 (窗口第一天)", () => {
    const baseline = new Date("2026-06-21T00:00:00Z");
    const now = new Date("2026-12-08T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(170);
  });
});

// 可疑点 4:phone format 与原始号长度
describe("formatPhoneForDisplay edge cases", () => {
  it("11 位 UK 号显示为 5+6", () => {
    expect(formatPhoneForDisplay("07724215611")).toBe("07724 215611");
  });
  it("5 位以下不加空格", () => {
    expect(formatPhoneForDisplay("12345")).toBe("12345");
  });
  it("13 位国际号怎么显示?", () => {
    // 现在 slice(0,5) + slice(5) = 5+8,中间一个空格
    expect(formatPhoneForDisplay("4477242156111")).toBe("44772 42156111");
    // 不会崩,但展示效果不理想(期望 4 4 7 7 2 4 2 1 5 6 1 1 1)
  });
});

// 可疑点 5:renderTemplate
describe("renderTemplate edge cases", () => {
  it("未匹配变量原样保留", () => {
    expect(renderTemplate("hi {{unknown}}", { phone: "x", days: 1, port_url: "y" })).toBe("hi {{unknown}}");
  });
  it("多变量", () => {
    expect(renderTemplate("{{phone}}-{{days}}-{{port_url}}", { phone: "1", days: 2, port_url: "3" })).toBe("1-2-3");
  });
});

// 可疑点 6:toLookupKey 边界
describe("toLookupKey edge cases", () => {
  it("6 位全部", () => {
    expect(toLookupKey("123456")).toBe("123456");
  });
  it("7 位取后 6", () => {
    expect(toLookupKey("1234567")).toBe("234567");
  });
  it("少于 6 位 null", () => {
    expect(toLookupKey("12345")).toBeNull();
  });
  it("空字符串", () => {
    expect(toLookupKey("")).toBeNull();
  });
});

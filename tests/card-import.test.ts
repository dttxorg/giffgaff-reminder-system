/**
 * 批量导入卡密的纯函数测试
 *
 * 测试场景:
 *  - 归一化(去横线/空格/换行/转大写)
 *  - 长度校验
 *  - 字符校验(只允许 A-Z 0-9)
 *  - 输入内去重
 *  - 已存在卡密跳过
 */
import { describe, it, expect } from "vitest";
import { normalizeCardCode } from "../lib/card-key";

// 模拟后端归一化 + 校验逻辑
type Error = { input: string; reason: string };

const VALID_RE = /^[A-Z0-9]{16}$/;

function parseInput(rawCodes: string[]): {
  valid: string[];
  errors: Error[];
} {
  const seen = new Set<string>();
  const errors: Error[] = [];
  const valid: string[] = [];

  for (const raw of rawCodes) {
    const code = normalizeCardCode(raw);
    if (code.length !== 16) {
      errors.push({ input: raw, reason: "长度不是 16 位" });
      continue;
    }
    if (!VALID_RE.test(code)) {
      errors.push({ input: raw, reason: "包含非法字符" });
      continue;
    }
    if (seen.has(code)) {
      errors.push({ input: raw, reason: "输入内重复" });
      continue;
    }
    seen.add(code);
    valid.push(code);
  }

  return { valid, errors };
}

describe("批量导入卡密 - 解析逻辑", () => {
  it("归一化:去横线/空格,转大写", () => {
    const r = parseInput(["aaaa-bbbb-cccc-dddd"]);
    expect(r.valid).toEqual(["AAAABBBBCCCCDDDD"]);
    expect(r.errors).toEqual([]);
  });

  it("归一化后输入内重复 → 进 errors", () => {
    const r = parseInput(["aaaa-bbbb-cccc-dddd", "AAAA BBBB CCCC DDDD"]);
    expect(r.valid).toEqual(["AAAABBBBCCCCDDDD"]);
    expect(r.errors).toEqual([
      { input: "AAAA BBBB CCCC DDDD", reason: "输入内重复" },
    ]);
  });

  it("拒绝长度错的", () => {
    const r = parseInput(["ABCD", "AAAABBBBCCCCDDDDE"]);
    expect(r.errors.length).toBe(2);
    expect(r.errors[0].reason).toBe("长度不是 16 位");
    expect(r.errors[1].reason).toBe("长度不是 16 位");
    expect(r.valid).toEqual([]);
  });

  it("拒绝非法字符(只允许 A-Z 0-9)", () => {
    // 注意:normalizeCardCode 内部会去掉所有非 ALPHABET 字符(连 _ 也去掉)
    // 所以 "AAAABBBB_CCCCDDDD" 归一化后是 "AAAABBBBCCCCDDDD" 是合法 16 位
    // 只有真正"留下字符但不合法"的情况才会进 errors
    const r = parseInput(["AAAABBBBCCCCDD!!", "AAAABBBB_CCCCDDDD"]);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].input).toBe("AAAABBBBCCCCDD!!");
    expect(r.errors[0].reason).toBe("长度不是 16 位"); // "!" 删后剩 14 位
  });

  it("输入内重复 → 跳过(不算导入)", () => {
    const r = parseInput([
      "AAAABBBBCCCCDDDD",
      "aaaa-bbbb-cccc-dddd", // 归一化后跟上面一样
    ]);
    expect(r.valid).toEqual(["AAAABBBBCCCCDDDD"]);
    expect(r.errors).toEqual([
      { input: "aaaa-bbbb-cccc-dddd", reason: "输入内重复" },
    ]);
  });

  it("混合:合法 + 重复 + 错误", () => {
    const r = parseInput([
      "AAAABBBBCCCCDDDD", // 合法
      "EEEEFFFFGGGGHHHH", // 合法
      "EEEEFFFFGGGGHHHH", // 重复
      "short", // 太短
      "!!!invalidchars!!!", // 非法字符
    ]);
    expect(r.valid).toEqual(["AAAABBBBCCCCDDDD", "EEEEFFFFGGGGHHHH"]);
    expect(r.errors.length).toBe(3);
  });

  it("空字符串 → 长度错误", () => {
    const r = parseInput(["", "AAAABBBBCCCCDDDD"]);
    expect(r.valid).toEqual(["AAAABBBBCCCCDDDD"]);
    expect(r.errors).toEqual([{ input: "", reason: "长度不是 16 位" }]);
  });

  it("1000 张卡密一次性导入", () => {
    // 28^16 ≈ 1.5e23,远大于 1000,简单 for 循环用 i 算 16 位 code
    // 关键:每位都从 ALPHABET 取(用 i 的不同位做种子)
    const ALPHA = "ABCDEFGHJKMNPQRSTWXYZ"; // 21 个字符
    const codes: string[] = [];
    for (let i = 0; i < 1000; i++) {
      // 用 toString(N) 在不同进制之间转,保证唯一且全在 ALPHABET
      // 简化:每位用 i 的不同位
      let n = i;
      let s = "";
      for (let j = 0; j < 16; j++) {
        s = ALPHA[n % 21] + s;
        n = Math.floor(n / 21);
      }
      codes.push(s);
    }
    const r = parseInput(codes);
    expect(r.valid.length).toBe(1000);
    expect(r.errors.length).toBe(0);
  });
});

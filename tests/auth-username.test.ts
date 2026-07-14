import { describe, it, expect } from "vitest";
import {
  normalizeUsername,
  isValidUsername,
  usernameError,
} from "../lib/auth";

describe("normalizeUsername", () => {
  it("文字账号:trim + lowercase", () => {
    expect(normalizeUsername("  Alice_2024  ")).toBe("alice_2024");
  });
  it("手机号:去空格/横线", () => {
    expect(normalizeUsername("07724 215611")).toBe("07724215611");
    expect(normalizeUsername("07724-215-611")).toBe("07724215611");
  });
  it("已经全小写不变", () => {
    expect(normalizeUsername("alice_2024")).toBe("alice_2024");
    expect(normalizeUsername("07724215611")).toBe("07724215611");
  });
  it("全大写转小写", () => {
    expect(normalizeUsername("ALICE")).toBe("alice");
  });
});

describe("isValidUsername", () => {
  describe("文字账号", () => {
    it("合法账号", () => {
      expect(isValidUsername("alice_2024")).toBe(true);
      expect(isValidUsername("a_b_c")).toBe(true);
      expect(isValidUsername("a123")).toBe(true);
      expect(isValidUsername("abc")).toBe(true); // 3 位最短
      expect(isValidUsername("a".repeat(20))).toBe(true); // 20 位最长
    });
    it("非法账号", () => {
      expect(isValidUsername("ab")).toBe(false); // 太短
      expect(isValidUsername("a".repeat(21))).toBe(false); // 太长
      expect(isValidUsername("1abc")).toBe(false); // 数字开头(不是手机号格式)
      // 注意:横线/空格在 normalizeUsername 阶段会被去掉
      //   "abc def" → "abcdef" (合法),"abc-def" → "abcdef" (合法)
      expect(isValidUsername("abc.def")).toBe(false); // 包含 . (无法归一化)
      expect(isValidUsername("abc@def")).toBe(false); // 包含 @
    });
    it("大小写不影响校验", () => {
      expect(isValidUsername("Alice_2024")).toBe(true);
      expect(isValidUsername("ALICE_2024")).toBe(true);
    });
  });

  describe("手机号账号(老用户迁移)", () => {
    it("合法手机号", () => {
      expect(isValidUsername("07724215611")).toBe(true); // 11 位
      expect(isValidUsername("123456")).toBe(true); // 6 位最短
      expect(isValidUsername("123456789012345")).toBe(true); // 15 位最长
    });
    it("带空格/横线的手机号(归一化后合法)", () => {
      expect(isValidUsername("07724 215611")).toBe(true);
      expect(isValidUsername("07724-215-611")).toBe(true);
    });
    it("非法手机号", () => {
      expect(isValidUsername("12345")).toBe(false); // 5 位太短(手机号至少 6 位)
      expect(isValidUsername("1234567890123456")).toBe(false); // 16 位太长
    });
  });
});

describe("usernameError", () => {
  it("空", () => {
    expect(usernameError("")).toBe("请输入账号");
  });
  it("文字账号太短", () => {
    expect(usernameError("ab")).toBe("账号至少 3 位");
  });
  it("文字账号太长", () => {
    expect(usernameError("a".repeat(21))).toBe("账号不超过 20 位");
  });
  it("手机号太短", () => {
    expect(usernameError("12345")).toBe("手机号至少 6 位");
  });
  it("手机号太长", () => {
    expect(usernameError("1".repeat(16))).toBe("手机号不超过 15 位");
  });
  it("数字开头但不是手机号格式", () => {
    expect(usernameError("1abc")).toBe("账号必须以小写字母开头(或使用 6+ 位纯数字手机号)");
  });
  it("包含非法字符", () => {
    expect(usernameError("abc.def")).toBe("账号只能包含小写字母、数字和下划线");
  });
  it("合法账号 → null", () => {
    expect(usernameError("alice_2024")).toBeNull();
    expect(usernameError("07724215611")).toBeNull();
    expect(usernameError("07724 215611")).toBeNull();
  });
});

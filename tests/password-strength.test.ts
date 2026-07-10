import { describe, it, expect } from "vitest";
import { passwordStrength } from "../lib/password-strength";

describe("passwordStrength", () => {
  it("空字符串 → weak", () => {
    expect(passwordStrength("")).toBe("weak");
  });

  it("短密码(< 8) → weak", () => {
    expect(passwordStrength("123")).toBe("weak");
    expect(passwordStrength("abc")).toBe("weak");
  });

  it("纯数字 8+ → weak(单一字符类)", () => {
    expect(passwordStrength("12345678")).toBe("weak");
    expect(passwordStrength("1357908642")).toBe("weak"); // 数字但打散,无连续
  });

  it("纯字母 8+ → weak", () => {
    expect(passwordStrength("AbCdEfGh")).toBe("weak");
    expect(passwordStrength("KxmpvNqb")).toBe("weak");
  });

  it("字母+数字 8-11 → medium(避免纯连续)", () => {
    expect(passwordStrength("Abc5K7mN")).toBe("medium");
  });

  it("字母+数字+符号 8-11 → medium", () => {
    expect(passwordStrength("Abc5K7m!")).toBe("medium");
  });

  it("字母+数字 12+ → strong", () => {
    expect(passwordStrength("Abc5K7mNq2xY")).toBe("strong");
  });

  it("字母+数字+符号 12+ → strong", () => {
    expect(passwordStrength("Abc5K7mNq2x!")).toBe("strong");
  });

  it("长密码(16+)+ 2 类字符 → strong", () => {
    expect(passwordStrength("Abc5K7mNq2x!@zQwR")).toBe("strong");
  });

  it("连续 4+ 字符在长密码里被检测 → weak", () => {
    // 7 位连续数字
    expect(passwordStrength("Abcd1234Xy")).toBe("weak");
  });

  it("常见弱密码 → weak", () => {
    expect(passwordStrength("password")).toBe("weak");
    expect(passwordStrength("qwerty123")).toBe("weak");
    expect(passwordStrength("admin123")).toBe("weak");
  });

  it("大写不影响(都尝试 lowercase 评估)", () => {
    expect(passwordStrength("PASSWORD")).toBe("weak");
  });

  it("复杂密码 → strong", () => {
    expect(passwordStrength("Kx9#mPq2vN@bH")).toBe("strong");
    expect(passwordStrength("correct-horse-battery-staple")).toBe("strong");
  });

  it("混合中等密码 → medium", () => {
    expect(passwordStrength("Hello2024!")).toBe("medium");
  });
});

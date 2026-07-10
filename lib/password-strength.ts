/**
 * 密码强度评估(纯前端规则,跟注册/重置共用)
 *
 * 维度:
 * - 长度(8/12/16 三档)
 * - 字符多样性(小写/大写/数字/符号)
 *
 * 强度:0-3 → "weak" / "medium" / "strong"
 * - 0: 长度 < 8 或 完全单一字符
 * - 1: 长度 8-11 且 2 种字符
 * - 2: 长度 8-11 且 3+ 种字符,或长度 12+ 且 2 种字符
 * - 3: 长度 12+ 且 3+ 种字符,或长度 16+ 且 2 种字符
 *
 * 弱密码规则(任何满足 → 标 "weak" + 提示):
 * - 纯数字 / 纯字母
 * - 连续 4+ 字符(1234 / abcd)
 * - 跟常见弱密码完全一致
 */
export type PasswordStrength = "weak" | "medium" | "strong";

const COMMON_WEAK = new Set([
  "password",
  "12345678",
  "123456789",
  "qwerty123",
  "qwertyuiop",
  "asdfghjk",
  "iloveyou",
  "admin123",
  "welcome1",
  "abcdefgh",
]);

function hasSequential(s: string, minLen = 4): boolean {
  // 检测数字或字母的连续 4+ 字符
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (diff === 1 || diff === -1) {
      run += 1;
      if (run >= minLen) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return "weak";
  const lower = password.toLowerCase();
  if (COMMON_WEAK.has(lower)) return "weak";

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  // 弱:纯数字 / 纯字母(<2 种) 或 连续字符
  if (variety < 2) return "weak";
  if (hasSequential(lower)) return "weak";

  const len = password.length;
  if (len >= 12 && variety >= 3) return "strong";
  if (len >= 16 && variety >= 2) return "strong";
  if (len >= 8 && variety >= 3) return "medium";
  return "weak";
}

export const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: "弱",
  medium: "中",
  strong: "强",
};

export const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: "bg-rose-500",
  medium: "bg-amber-500",
  strong: "bg-emerald-500",
};

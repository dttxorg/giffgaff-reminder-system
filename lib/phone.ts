// 手机号归一化与模糊匹配工具

/**
 * 归一化用户输入：去所有非数字字符
 * "07724 215611" → "07724215611"
 * "07724-215611" → "07724215611"
 * "  07724215611 " → "07724215611"
 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * 提取后 6 位作为匹配键
 * 不足 6 位返回 null
 */
export function extractLookupKey(normalizedPhone: string): string | null {
  if (normalizedPhone.length < 6) return null;
  return normalizedPhone.slice(-6);
}

/**
 * 一次性：归一化 + 提取后 6 位
 */
export function toLookupKey(input: string): string | null {
  return extractLookupKey(normalizePhone(input));
}

/**
 * 格式化展示：每 5 位后加空格（giffgaff 习惯格式）
 * "07724215611" → "07724 215611"
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (phoneNumber.startsWith("*")) return phoneNumber;
  if (phoneNumber.length <= 5) return phoneNumber;
  return phoneNumber.slice(0, 5) + " " + phoneNumber.slice(5);
}

/** 公开 Bearer 页面只展示末 4 位，不把完整号码发送到浏览器。 */
export function maskPhoneForPublic(phoneNumber: string): string {
  return `****** ${phoneNumber.slice(-4)}`;
}

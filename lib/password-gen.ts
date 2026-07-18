// 安全随机密码生成工具
//
// 使用 crypto.getRandomValues（Node + 浏览器都支持）保证密码不可预测。
// Math.random() 不是 CSPRNG,理论上可以缩小爆破空间。

const DEFAULT_ALPHABET =
  "23456789ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz"; // 去掉了 0/1/I/O/l/0/1 等易混字符

/**
 * 生成一个长度为 n 的密码（默认 12 位）。
 * @param length 长度,默认 12
 * @param alphabet 可选字符集,默认排除易混淆字符
 */
export function generateSecurePassword(
  length: number = 12,
  alphabet: string = DEFAULT_ALPHABET
): string {
  if (!Number.isSafeInteger(length) || length < 1 || length > 4096) {
    throw new Error("length must be an integer between 1 and 4096");
  }
  if (alphabet.length < 2) throw new Error("alphabet must have >= 2 chars");
  if (alphabet.length > 256) {
    throw new Error("alphabet must have <= 256 chars");
  }

  // 拒绝不安全的随机源降级:直接抛错而不是 fallback 到 Math.random
  const len = alphabet.length;
  // 每个字符需要 1 字节随机数 → 取 [0, 256),然后 mod len。
  // 用 rejection sampling 避免 modulo bias:如果取到的值 >= 256 - 256 % len 则丢弃重抽。
  const maxUnbiased = Math.floor(256 / len) * len;

  let out = "";
  // 持续补充随机批次，直到达到要求长度；拒绝采样再多也不会返回短密码。
  while (out.length < length) {
    const remaining = length - out.length;
    const bytes = new Uint8Array(Math.min(remaining * 2, 8192));
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < maxUnbiased) {
        out += alphabet[b % len];
        if (out.length === length) break;
      }
    }
  }
  return out;
}

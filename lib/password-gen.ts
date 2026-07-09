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
  if (length < 1) throw new Error("length must be >= 1");
  if (alphabet.length < 2) throw new Error("alphabet must have >= 2 chars");

  // 拒绝不安全的随机源降级:直接抛错而不是 fallback 到 Math.random
  const len = alphabet.length;
  // 每个字符需要 1 字节随机数 → 取 [0, 256),然后 mod len。
  // 用 rejection sampling 避免 modulo bias:如果取到的值 >= 256 - 256 % len 则丢弃重抽。
  const maxUnbiased = Math.floor(256 / len) * len;

  const bytes = new Uint8Array(length * 2); // 多取一些以应对 rejection
  crypto.getRandomValues(bytes);

  let out = "";
  let i = 0;
  while (out.length < length && i < bytes.length) {
    const b = bytes[i++];
    if (b < maxUnbiased) {
      out += alphabet[b % len];
    }
  }
  // 极端情况下（极小概率）丢弃太多,补一次:再取一批
  if (out.length < length) {
    const extra = new Uint8Array(length);
    crypto.getRandomValues(extra);
    for (let j = 0; j < length - out.length && j < extra.length; j++) {
      if (extra[j] < maxUnbiased) {
        out += alphabet[extra[j] % len];
      }
    }
  }
  return out;
}

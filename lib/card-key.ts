// 卡密生成与归一化工具
import { randomBytes } from "crypto";

// 去掉易混字符的字符表（0/O/1/I/L/U/V 全部排除）
// 28 个字符，16 位 ≈ 75 bit 熵（远超需求）
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTWXYZ";
const ALPHABET_LEN = ALPHABET.length; // 28
const CODE_LEN = 16; // 总字符数
const SEGMENT_LEN = 4; // 每段字符数
const TOTAL_SEGMENTS = CODE_LEN / SEGMENT_LEN; // 4 段

/**
 * 生成一个原始 16 字符卡密（无连字符）
 * 例: "7K9P3R4M8H2XN5YQ"
 */
export function generateRawCode(): string {
  // 用 rejection sampling 避免 modulo bias
  const bytes = randomBytes(CODE_LEN * 2);
  let out = "";
  let i = 0;
  while (out.length < CODE_LEN) {
    if (i >= bytes.length) {
      // 理论上 randomBytes(32) 足够（28 < 256，2 字节足够），但保险起见
      throw new Error("random bytes exhausted");
    }
    const b = bytes[i++];
    if (b < Math.floor(256 / ALPHABET_LEN) * ALPHABET_LEN) {
      out += ALPHABET[b % ALPHABET_LEN];
    }
  }
  return out;
}

/**
 * 生成带连字符的可读卡密
 * 例: "7K9P-3R4M-8H2X-N5YQ"
 */
export function generateCardCode(): string {
  const raw = generateRawCode();
  const segments: string[] = [];
  for (let i = 0; i < TOTAL_SEGMENTS; i++) {
    segments.push(raw.slice(i * SEGMENT_LEN, (i + 1) * SEGMENT_LEN));
  }
  return segments.join("-");
}

/**
 * 归一化用户输入的卡密：去所有非字符表字符、转大写
 * "7k9p-3r4m-8h2x-n5yq" → "7K9P3R4M8H2XN5YQ"
 * "7K9P 3R4M 8H2X N5YQ" → "7K9P3R4M8H2XN5YQ"
 */
export function normalizeCardCode(input: string): string {
  const upper = input.toUpperCase();
  return upper.replace(new RegExp(`[^${ALPHABET}]`, "g"), "");
}

/**
 * 把归一化后的原始码格式化为展示格式
 * "7K9P3R4M8H2XN5YQ" → "7K9P-3R4M-8H2X-N5YQ"
 */
export function formatCardCode(raw: string): string {
  if (raw.length !== CODE_LEN) return raw;
  const segments: string[] = [];
  for (let i = 0; i < TOTAL_SEGMENTS; i++) {
    segments.push(raw.slice(i * SEGMENT_LEN, (i + 1) * SEGMENT_LEN));
  }
  return segments.join("-");
}

/**
 * 格式化用户输入:去非字符表字符 + 转大写 + 每 4 段加 - 分隔
 * 专门给 input 的 onChange 用,所以不会因为 raw 长度不够就拒绝 — 边输入边格式化。
 * "7k9p3r4m" → "7K9P-3R4M"
 * "SCT2 XXX" → "SCT2-XXX"(后缀不足 4 字符也加分隔,粘贴多余字符自动截断)
 * "  7k9p-3r4m-8h2x-n5yq  " → "7K9P-3R4M-8H2X-N5YQ"
 */
export function formatCardCodeInput(input: string): string {
  const upper = input.toUpperCase();
  // 只保留字符表里的字符(用户可能粘贴了横线/空格/换行)
  const cleaned = upper.replace(new RegExp(`[^${ALPHABET}]`, "g"), "");
  // 截断到 16 位(防御性:用户粘贴多份或多余字符)
  const raw = cleaned.slice(0, CODE_LEN);
  if (raw.length === 0) return "";
  // 按 4 段拼回去,最后一段如果不足 4 字符也拼上
  const segments: string[] = [];
  for (let i = 0; i < raw.length; i += SEGMENT_LEN) {
    segments.push(raw.slice(i, i + SEGMENT_LEN));
  }
  return segments.join("-");
}

/**
 * 校验输入是否能归一化成合法卡密
 */
export function isValidCardInput(input: string): boolean {
  const normalized = normalizeCardCode(input);
  return normalized.length === CODE_LEN;
}

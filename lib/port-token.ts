// SIM 公开 URL token 管理 - 纯工具部分
//
// 背景:
// 公开 URL 原先使用 sim.id(自增 int),可被枚举(/p/1, /p/2, ...),泄露 PII(手机号)。
// 修复: 新 sim 在创建时生成一个不可枚举的随机 token,公开 URL 改为 /p/${token}。
//
// 安全:
// - 用 crypto.getRandomValues(CSPRNG),不是 Math.random
// - 32 字符 url-safe (base64url,无 padding): 信息熵 ~192 bits,
//   暴力枚举 10^9 个 token 仍然安全
// - 唯一约束在 DB 层(@unique),生成碰撞概率 ~0 但 DB 兜底

const TOKEN_BYTES = 24; // 24 字节 = 192 bits = base64url 后 32 字符
const TOKEN_LENGTH = 32;

/**
 * url-safe base64: +/= 替换为 -_ 且去掉 padding
 */
function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 生成一个不可枚举的 32 字符 url-safe token
 */
export function generatePortToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return toUrlSafe(b64).slice(0, TOKEN_LENGTH);
}

/**
 * 判断一个字符串是否是公开 URL token。数字 ID 永远不作为公开凭据接受。
 */
export function looksLikeToken(s: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return false;
  if (/^\d+$/.test(s)) return false;
  return s.length >= 32 && s.length <= 64;
}

// 鉴权工具：密码哈希/校验（纯函数，不依赖 DB）
// ensureDefaultAdmin 在 ./admin-bootstrap.ts 里（依赖 DB）
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const SCRYPT_KEYLEN = 64;

/**
 * 密码哈希（scrypt 格式）
 * 输出：scrypt$N$r$p$saltB64$hashB64
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p }, (err, derivedKey) => {
      if (err) return reject(err);
      const out = `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
      resolve(out);
    });
  });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (
    !Number.isFinite(N) ||
    !Number.isFinite(r) ||
    !Number.isFinite(p) ||
    salt.length === 0 ||
    expected.length === 0
  ) {
    return false;
  }
  return new Promise((resolve) => {
    try {
      scrypt(password, salt, expected.length, { N, r, p }, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          resolve(timingSafeEqual(derivedKey, expected));
        } catch {
          resolve(false);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * 校验 cron 鉴权头
 */
export function checkCronAuth(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.warn("[cron] CRON_SECRET 未设置，跳过鉴权（仅用于本地调试）");
    return true;
  }
  return auth === `Bearer ${expected}`;
}

export function generateVerificationCode(): string {
  // 6 位数字
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateId(): string {
  return randomBytes(16).toString("hex");
}
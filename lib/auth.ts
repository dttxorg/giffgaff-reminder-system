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
// =============================================================================
// Username 校验
// =============================================================================
// 规则(同时支持两种格式):
//  1) 文字账号:3-20 位,首字符必须小写字母,后续 [a-z0-9_]   例: alice_2024
//  2) 手机号账号:6-15 位纯数字                                例: 07724215611
// 老用户(username = 手机号)走规则 2;新用户自选账号走规则 1。
// 存库前 normalizeUsername 转小写 + 去首尾空白 + 去空格/横线(手机号归一化)
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const PHONE_MIN = 6;
const PHONE_MAX = 15;

export function normalizeUsername(input: string): string {
  // 既支持 "alice_2024" 也支持 "07724 215611" / "07724-215611"
  return input.replace(/[\s-]/g, "").trim().toLowerCase();
}

/** 判断输入"是不是纯数字"(手机号账号的判定) */
function isAllDigits(s: string): boolean {
  return /^\d+$/.test(s);
}

/** 校验账号是否合法(返回 true / false) */
export function isValidUsername(input: string): boolean {
  return usernameError(input) === null;
}

/** 返回 null = 合法,否则为人类可读错误信息 */
export function usernameError(input: string): string | null {
  if (!input) return "请输入账号";
  const v = normalizeUsername(input);
  if (v.length < USERNAME_MIN) return `账号至少 ${USERNAME_MIN} 位`;
  if (v.length > USERNAME_MAX) return `账号不超过 ${USERNAME_MAX} 位`;

  if (isAllDigits(v)) {
    // 手机号账号
    if (v.length < PHONE_MIN) return `手机号至少 ${PHONE_MIN} 位`;
    if (v.length > PHONE_MAX) return `手机号不超过 ${PHONE_MAX} 位`;
    return null;
  }
  // 文字账号
  if (!/^[a-z]/.test(v)) return "账号必须以小写字母开头(或使用 6+ 位纯数字手机号)";
  if (!/^[a-z0-9_]+$/.test(v)) return "账号只能包含小写字母、数字和下划线";
  return null;
}

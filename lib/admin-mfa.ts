import { createHmac, timingSafeEqual } from "node:crypto";

const TOTP_STEP_SECONDS = 30;

function decodeBase32(value: string): Buffer | null {
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) return null;
  let bits = "";
  for (const char of normalized) {
    const index = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char);
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return bytes.length > 0 ? Buffer.from(bytes) : null;
}

function totp(secret: Buffer, counter: number): string {
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(input).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export function adminMfaConfigurationValid(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = decodeBase32(process.env.ADMIN_TOTP_SECRET ?? "");
  return secret !== null && secret.length >= 20;
}

/** 生产必须配置 TOTP；开发/测试未配置时跳过，避免污染本地账号。 */
export function verifyAdminTotp(
  otp: string | undefined,
  nowMs = Date.now()
): boolean {
  const secret = decodeBase32(process.env.ADMIN_TOTP_SECRET ?? "");
  if (!secret || secret.length < 20) return process.env.NODE_ENV !== "production";
  if (!otp || !/^\d{6}$/.test(otp)) return false;

  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  const actual = Buffer.from(otp);
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(totp(secret, counter + drift));
    if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
      return true;
    }
  }
  return false;
}

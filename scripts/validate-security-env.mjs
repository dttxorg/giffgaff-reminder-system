const required = [
  "CRON_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
];

const DEFAULT_PUBLIC_BASE_URL = "https://baohao.681218.xyz";

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(`安全环境变量缺失: ${missing.join(", ")}`);
}

if (process.env.CRON_SECRET.length < 32) {
  throw new Error("CRON_SECRET 至少需要 32 个字符");
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD 至少需要 12 个字符");
}
const totpSecret = process.env.ADMIN_TOTP_SECRET?.trim() ?? "";
if (
  totpSecret &&
  (!/^[A-Z2-7]+=*$/i.test(totpSecret) ||
    totpSecret.replace(/=+$/g, "").length < 32)
) {
  throw new Error("ADMIN_TOTP_SECRET 必须是至少 160 bit 的 Base32 字符串");
}

const publicUrl = new URL(
  process.env.PUBLIC_BASE_URL?.trim() || DEFAULT_PUBLIC_BASE_URL
);
if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password) {
  throw new Error("PUBLIC_BASE_URL 必须是无认证信息的 HTTPS URL");
}

console.log(
  `[security-env] required settings present; public URL=${publicUrl.origin}; MFA=${totpSecret ? "enabled" : "optional/not configured"}`
);

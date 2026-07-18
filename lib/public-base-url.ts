export const DEFAULT_PUBLIC_BASE_URL = "https://baohao.681218.xyz";

export function getPublicBaseUrl(): string | null {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  // 本项目已有固定正式域名。环境变量仍可覆盖，Preview/Production 缺少变量时
  // 统一生成正式域名链接，避免部署因新增配置项中断。
  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PUBLIC_BASE_URL;
  }

  const vercelHost = process.env.VERCEL_URL?.trim().toLowerCase();
  if (vercelHost && /^[a-z0-9.-]+$/.test(vercelHost)) {
    return `https://${vercelHost}`;
  }
  return "http://localhost:3000";
}

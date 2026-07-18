import { getPublicBaseUrl } from "./public-base-url";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function parseOrigin(value: string | null): string | null {
  if (!value || value === "null") return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function trustedOrigins(request: Request): Set<string> {
  const configured = parseOrigin(process.env.PUBLIC_BASE_URL ?? null);
  if (configured) return new Set([configured]);
  if (process.env.NODE_ENV !== "production") {
    return new Set([new URL(request.url).origin]);
  }

  // 生产环境使用代码内固定正式域名；额外接受 Vercel 注入的部署域名，
  // 但不从请求 Host 派生信任来源。
  const origins = new Set<string>();
  const publicOrigin = parseOrigin(getPublicBaseUrl());
  if (publicOrigin) origins.add(publicOrigin);
  for (const name of ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const) {
    const host = process.env[name]?.trim().toLowerCase();
    if (host && /^[a-z0-9.-]+$/.test(host)) {
      origins.add(`https://${host}`);
    }
  }
  return origins;
}

/**
 * 状态变更请求的浏览器来源校验。
 *
 * - 浏览器请求带 Origin 时必须与当前站点完全同源；同站不同子域也拒绝。
 * - 没有 Origin 时，用 Fetch Metadata / Referer 继续判断。
 * - Cron 等非浏览器客户端通常不发送这些头，仍可依靠自己的 Bearer 鉴权。
 */
export function isTrustedMutationRequest(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const allowed = trustedOrigins(request);
  const originHeader = request.headers.get("origin");
  if (originHeader !== null) {
    const origin = parseOrigin(originHeader);
    return origin !== null && allowed.has(origin);
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;

  const referer = request.headers.get("referer");
  if (referer) {
    const refererOrigin = parseOrigin(referer);
    return refererOrigin !== null && allowed.has(refererOrigin);
  }

  return true;
}

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
  // 生产域名必须来自显式配置，不能把可能受 Host 头影响的 request.url 当作信任根。
  if (process.env.NODE_ENV === "production") return new Set();
  return new Set([new URL(request.url).origin]);
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

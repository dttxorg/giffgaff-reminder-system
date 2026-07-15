export interface RedeemSessionContextPayload {
  authenticated: boolean;
  username?: string;
  simCount: number;
}

const CACHE_MS = 5_000;
let cached:
  | { value: RedeemSessionContextPayload; expiresAt: number }
  | undefined;
let inFlight: Promise<RedeemSessionContextPayload> | undefined;
let cacheVersion = 0;

/**
 * 兑换页和根导航会在同一次 hydration 中同时确认登录态。
 * 共享短时结果可把两个组件的并发请求合并为一次，同时避免长期缓存登录状态。
 */
export function getRedeemSessionContext(): Promise<RedeemSessionContextPayload> {
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }
  if (inFlight) return inFlight;

  const requestVersion = cacheVersion;
  const request = fetch("/api/auth/session?details=redeem", {
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("session request failed");
      const data = (await response.json()) as {
        authenticated?: boolean;
        username?: string;
        simCount?: number;
      };
      return {
        authenticated: data.authenticated === true,
        username: data.username,
        simCount: data.simCount ?? 0,
      };
    })
    .then((value) => {
      if (requestVersion === cacheVersion) {
        cached = { value, expiresAt: Date.now() + CACHE_MS };
      }
      return value;
    })
    .finally(() => {
      if (inFlight === request) inFlight = undefined;
    });

  inFlight = request;
  return request;
}

/** 登出、重试或测试隔离时主动清空。 */
export function clearClientSessionCache() {
  cacheVersion += 1;
  cached = undefined;
  inFlight = undefined;
}

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { prisma } from "./db";

interface RateLimitRow {
  count: number;
  resetAt: Date | string;
}

export interface RateLimitRule {
  scope: string;
  identifiers: string[];
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  unavailable?: boolean;
}

function normalizeIp(value: string): string | null {
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  if (isIP(candidate)) return candidate;
  const ipv4WithPort = candidate.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/)?.[1];
  return ipv4WithPort && isIP(ipv4WithPort) ? ipv4WithPort : null;
}

export function getClientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const parsed = normalizeIp(vercel.split(",")[0]);
    if (parsed) return parsed;
  }
  for (const header of ["cf-connecting-ip", "x-real-ip"]) {
    const parsed = normalizeIp(request.headers.get(header) ?? "");
    if (parsed) return parsed;
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // 取最右侧代理写入的地址，避免信任客户端伪造的首项。
    const parts = forwarded.split(",");
    const parsed = normalizeIp(parts[parts.length - 1]);
    if (parsed) return parsed;
  }
  return "unknown";
}

function bucketKey(rule: RateLimitRule): string {
  return createHash("sha256")
    .update([rule.scope, ...rule.identifiers].join("\0"))
    .digest("hex");
}

async function consume(rule: RateLimitRule): Promise<RateLimitResult> {
  const key = bucketKey(rule);
  const resetAt = new Date(Date.now() + rule.windowMs);
  try {
    const [row] = await prisma.$queryRaw<RateLimitRow[]>`
      WITH cleanup AS (
        DELETE FROM "RateLimitBucket"
        WHERE "resetAt" < CURRENT_TIMESTAMP - INTERVAL '1 day'
      ), upserted AS (
        INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
        VALUES (${key}, 1, ${resetAt}, CURRENT_TIMESTAMP)
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN "RateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN 1
            ELSE "RateLimitBucket"."count" + 1
          END,
          "resetAt" = CASE
            WHEN "RateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."resetAt"
            ELSE "RateLimitBucket"."resetAt"
          END,
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "count", "resetAt"
      )
      SELECT "count", "resetAt" FROM upserted
    `;
    if (!row) return { allowed: false, retryAfterSeconds: 60, unavailable: true };
    const resetTime =
      row.resetAt instanceof Date
        ? row.resetAt.getTime()
        : new Date(row.resetAt).getTime();
    if (!Number.isFinite(resetTime)) {
      return { allowed: false, retryAfterSeconds: 60, unavailable: true };
    }
    return {
      allowed: row.count <= rule.limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((resetTime - Date.now()) / 1000)
      ),
    };
  } catch (error) {
    console.error("[rate-limit] persistent limiter unavailable", error);
    return { allowed: false, retryAfterSeconds: 60, unavailable: true };
  }
}

export async function enforceRateLimits(
  rules: RateLimitRule[]
): Promise<RateLimitResult> {
  const results = await Promise.all(rules.map(consume));
  return (
    results.find((result) => result.unavailable) ??
    results.find((result) => !result.allowed) ??
    { allowed: true, retryAfterSeconds: 0 }
  );
}

export function rateLimitResponse(result: RateLimitResult) {
  const status = result.unavailable ? 503 : 429;
  return NextResponse.json(
    {
      ok: false,
      error: result.unavailable
        ? "服务保护组件暂时不可用，请稍后重试"
        : "请求过于频繁，请稍后重试",
    },
    {
      status,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "private, no-store",
      },
    }
  );
}

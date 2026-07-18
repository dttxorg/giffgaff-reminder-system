import { NextRequest, NextResponse } from "next/server";
import { isTrustedMutationRequest } from "@/lib/request-security";

const MAX_API_BODY_BYTES = 1_000_000;

export function proxy(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    Number.isFinite(contentLength) &&
    contentLength > MAX_API_BODY_BYTES
  ) {
    return NextResponse.json(
      { ok: false, error: "请求体过大" },
      {
        status: 413,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "请求来源校验失败" },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};

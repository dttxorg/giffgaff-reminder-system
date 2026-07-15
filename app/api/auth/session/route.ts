import { NextResponse } from "next/server";
import {
  getCurrentUserSessionStatus,
  getCurrentUserSessionSummary,
} from "@/lib/session";

export async function GET(request: Request) {
  const wantsRedeemDetails =
    new URL(request.url).searchParams.get("details") === "redeem";
  const payload = wantsRedeemDetails
    ? await getCurrentUserSessionSummary().then((summary) => ({
        authenticated: summary !== null,
        username: summary?.username,
        simCount: summary?.simCount ?? 0,
      }))
    : { authenticated: await getCurrentUserSessionStatus() };
  return NextResponse.json(
    payload,
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

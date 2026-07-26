import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mapWithConcurrency } from "@/lib/async-pool";
import { normalizeCardCode } from "@/lib/card-key";
import { MAX_BATCH_REDEEM_ITEMS } from "@/lib/redeem-batch";
import { redeemErrorMessage } from "@/lib/redeem-errors";
import { normalizePhone } from "@/lib/phone";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { redeemCard } from "@/lib/redeem";
import { getCurrentUserId } from "@/lib/session";

const BatchItemSchema = z.object({
  code: z.string().min(1).max(64),
  phoneNumber: z.string().min(1).max(32),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const BodySchema = z.object({
  items: z
    .array(BatchItemSchema)
    .min(1, "请至少导入 1 条数据")
    .max(MAX_BATCH_REDEEM_ITEMS, `单次最多 ${MAX_BATCH_REDEEM_ITEMS} 条`),
});

type BatchResultItem =
  | { index: number; ok: true; simId: number }
  | { index: number; ok: false; error: string };

// 50 条数据会拆成有界并发的小事务，给 Serverless 留足数据库往返时间。
export const maxDuration = 60;

export async function POST(req: Request) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json(
      { ok: false, error: "请先登录后再批量导入" },
      { status: 401 }
    );
  }

  const limited = await enforceRateLimits([
    {
      scope: "redeem-batch-user",
      identifiers: [String(currentUserId)],
      limit: 5,
      windowMs: 15 * 60 * 1000,
    },
    {
      scope: "redeem-batch-ip",
      identifiers: [getClientIp(req)],
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体格式错误" },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message || "批量数据格式错误",
      },
      { status: 400 }
    );
  }

  const seenCodes = new Set<string>();
  const seenPhones = new Set<string>();
  const prepared = parsed.data.items.map((item, index) => {
    const code = normalizeCardCode(item.code);
    const phoneNumber = normalizePhone(item.phoneNumber);
    let earlyError: string | null = null;

    if (code.length === 16 && seenCodes.has(code)) {
      earlyError = "兑换码在本次导入中重复";
    } else if (
      /^\d{6,15}$/.test(phoneNumber) &&
      seenPhones.has(phoneNumber)
    ) {
      earlyError = "手机号在本次导入中重复";
    }
    if (code.length === 16) seenCodes.add(code);
    if (/^\d{6,15}$/.test(phoneNumber)) seenPhones.add(phoneNumber);

    return {
      index,
      code,
      phoneNumber,
      activatedAt: item.activatedAt,
      earlyError,
    };
  });

  const results = await mapWithConcurrency(
    prepared,
    3,
    async (item): Promise<BatchResultItem> => {
      if (item.earlyError) {
        return { index: item.index, ok: false, error: item.earlyError };
      }

      try {
        const result = await prisma.$transaction((tx) =>
          redeemCard(
            {
              rawCode: item.code,
              phoneNumber: item.phoneNumber,
              activatedAt: item.activatedAt,
            },
            currentUserId,
            tx
          )
        );
        if (!result.ok) {
          return {
            index: item.index,
            ok: false,
            error: redeemErrorMessage(result.error),
          };
        }
        return { index: item.index, ok: true, simId: result.simId };
      } catch (error) {
        console.error("[redeem-batch] item transaction failed", {
          index: item.index,
          error,
        });
        return {
          index: item.index,
          ok: false,
          error: "兑换暂时失败，请稍后重试",
        };
      }
    }
  );

  const redeemed = results.filter((result) => result.ok).length;
  return NextResponse.json({
    ok: true,
    total: results.length,
    redeemed,
    failed: results.length - redeemed,
    results,
  });
}

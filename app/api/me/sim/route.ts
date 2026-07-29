import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, getCurrentUserSessionId } from "@/lib/session";
import { invalidatePublicSimCache } from "@/lib/public-sim-cache";
import {
  updateCurrentUserSimActivatedAt,
  updateCurrentUserSimDetails,
} from "@/lib/user-sim-writes";
import { parseISOCalendarDate, todayShanghaiISODate } from "@/lib/date";
import { generatePortToken } from "@/lib/port-token";
import { isValidPhone } from "@/lib/redeem";
import { carrierPolicy } from "@/lib/carrier";

const BodySchema = z.object({
  activatedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 YYYY-MM-DD")
    .optional(),
  carrier: z.enum(["giffgaff", "ctexcel"]).optional(),
  reminderStartDay: z.number().int().min(0).max(3649).optional(),
  cycleDays: z.number().int().min(1).max(3650).optional(),
  /** 多卡场景下指明修改哪张 sim;不传时默认 sims[0] */
  simId: z.number().int().positive().optional(),
})
  .refine(
    (data) =>
      data.activatedAt !== undefined ||
      data.carrier !== undefined ||
      data.reminderStartDay !== undefined ||
      data.cycleDays !== undefined,
    { message: "没有需要更新的内容" }
  )
  .refine(
    (data) =>
      (data.reminderStartDay === undefined) === (data.cycleDays === undefined),
    { message: "提醒开始日与截止日需要一起填写" }
  )
  .refine(
    (data) =>
      data.reminderStartDay === undefined ||
      data.cycleDays === undefined ||
      data.reminderStartDay < data.cycleDays,
    { message: "提醒开始日必须早于截止日" }
  );

const DeleteSchema = z.object({
  simId: z.number().int().positive(),
});

const CreateSchema = z
  .object({
    phoneNumber: z.string().min(1).max(32),
    activatedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 YYYY-MM-DD"),
    carrier: z.enum(["giffgaff", "ctexcel"]),
    reminderStartDay: z.number().int().min(0).max(3649).optional(),
    cycleDays: z.number().int().min(1).max(3650).optional(),
  })
  .refine(
    (data) =>
      (data.reminderStartDay === undefined) === (data.cycleDays === undefined),
    { message: "提醒开始日与截止日需要一起填写" }
  )
  .refine(
    (data) =>
      data.reminderStartDay === undefined ||
      data.cycleDays === undefined ||
      data.reminderStartDay < data.cycleDays,
    { message: "提醒开始日必须早于截止日" }
  );

function validActivatedAt(value: string): Date | null {
  const date = parseISOCalendarDate(value);
  if (!date) return null;
  const todayShanghai = parseISOCalendarDate(todayShanghaiISODate())!;
  return date <= todayShanghai ? date : null;
}

/**
 * PATCH /api/me/sim
 * 修改某张 sim 的激活日期
 *
 * - 必须已登录
 * - sim 必须属于当前用户(防越权改他人 sim)
 * - 日期不能晚于今天
 * - 不影响 lastPortedAt(激活日期 vs 上次保号日期 语义独立)
 */
export async function PATCH(req: Request) {
  const sessionId = await getCurrentUserSessionId();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "参数错误" },
      { status: 400 }
    );
  }

  const newActivated = parsed.data.activatedAt
    ? validActivatedAt(parsed.data.activatedAt)
    : undefined;
  if (parsed.data.activatedAt && !newActivated)
    return NextResponse.json(
      { ok: false, error: "激活日期无效或晚于今天" },
      { status: 400 }
    );

  if (parsed.data.simId !== undefined) {
    const defaults = parsed.data.carrier
      ? carrierPolicy(parsed.data.carrier)
      : null;
    const hasRuleUpdate =
      parsed.data.carrier !== undefined ||
      parsed.data.reminderStartDay !== undefined ||
      parsed.data.cycleDays !== undefined;
    const outcome = hasRuleUpdate
      ? await updateCurrentUserSimDetails(sessionId, parsed.data.simId, {
          activatedAt: newActivated ?? undefined,
          carrier: parsed.data.carrier,
          reminderStartDay:
            parsed.data.reminderStartDay ?? defaults?.reminderStartDay,
          cycleDays: parsed.data.cycleDays ?? defaults?.cycleDays,
        })
      : await updateCurrentUserSimActivatedAt(
          sessionId,
          parsed.data.simId,
          newActivated!
        );
    if (!outcome.authenticated) {
      return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    }
    if (outcome.sim) {
      invalidatePublicSimCache(outcome.sim);
      return NextResponse.json({ ok: true, simId: outcome.sim.id });
    }
    if (!outcome.hasSims) {
      return NextResponse.json(
        { ok: false, error: "您账号下没有 SIM 卡" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "无权修改该 SIM 卡" },
      { status: 403 }
    );
  }

  // 兼容旧客户端不传 simId 的路径。
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const firstOwnedSim = await prisma.sim.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!firstOwnedSim) {
    return NextResponse.json(
      { ok: false, error: "您账号下没有 SIM 卡" },
      { status: 400 }
    );
  }
  const targetSim = await prisma.sim.update({
    where: { id: firstOwnedSim.id },
    data: {
      ...(newActivated ? { activatedAt: newActivated } : {}),
      ...(parsed.data.carrier ? { carrier: parsed.data.carrier } : {}),
      ...(parsed.data.reminderStartDay !== undefined
        ? { reminderStartDay: parsed.data.reminderStartDay }
        : parsed.data.carrier
          ? {
              reminderStartDay:
                carrierPolicy(parsed.data.carrier).reminderStartDay,
            }
          : {}),
      ...(parsed.data.cycleDays !== undefined
        ? { cycleDays: parsed.data.cycleDays }
        : parsed.data.carrier
          ? { cycleDays: carrierPolicy(parsed.data.carrier).cycleDays }
          : {}),
    },
    select: { id: true, portToken: true },
  });
  invalidatePublicSimCache(targetSim);

  return NextResponse.json({ ok: true, simId: targetSim.id });
}

/**
 * DELETE /api/me/sim
 * 移除当前号码提醒，同时把通知渠道保存到账号并返还一个提醒名额。
 */
export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: "参数错误" }, { status: 400 });

  const removed = await prisma.$transaction(async (tx) => {
    const sim = await tx.sim.findFirst({
      where: { id: parsed.data.simId, userId },
      select: {
        id: true,
        portToken: true,
        channel: true,
        channelKey: true,
      },
    });
    if (!sim) return null;
    await tx.user.update({
      where: { id: userId },
      data: {
        availableReminderSlots: { increment: 1 },
        ...(sim.channelKey.trim()
          ? {
              defaultChannel: sim.channel,
              defaultChannelKey: sim.channelKey,
            }
          : {}),
      },
    });
    await tx.sim.delete({ where: { id: sim.id } });
    return sim;
  });
  if (!removed)
    return NextResponse.json(
      { ok: false, error: "提醒不存在或已被移除" },
      { status: 404 }
    );
  invalidatePublicSimCache(removed);
  return NextResponse.json({
    ok: true,
    retainedSlot: true,
    message: "号码提醒已移除，通知渠道和提醒名额已保留",
  });
}

/**
 * POST /api/me/sim
 * 使用删除号码时保留的提醒名额填写新号码，无需再次兑换。
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "参数错误" },
      { status: 400 }
    );
  const phoneNumber = parsed.data.phoneNumber.replace(/\D/g, "");
  if (!isValidPhone(phoneNumber))
    return NextResponse.json({ ok: false, error: "号码格式不正确" }, { status: 400 });
  const activatedAt = validActivatedAt(parsed.data.activatedAt);
  if (!activatedAt)
    return NextResponse.json(
      { ok: false, error: "激活日期无效或晚于今天" },
      { status: 400 }
    );

  try {
    const sim = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          availableReminderSlots: true,
          defaultChannel: true,
          defaultChannelKey: true,
        },
      });
      if (!user || user.availableReminderSlots < 1) return null;
      const claimed = await tx.user.updateMany({
        where: { id: userId, availableReminderSlots: { gt: 0 } },
        data: { availableReminderSlots: { decrement: 1 } },
      });
      if (claimed.count !== 1) return null;
      const defaults = carrierPolicy(parsed.data.carrier);
      return tx.sim.create({
        data: {
          phoneNumber,
          activatedAt,
          carrier: parsed.data.carrier,
          reminderStartDay:
            parsed.data.reminderStartDay ?? defaults.reminderStartDay,
          cycleDays: parsed.data.cycleDays ?? defaults.cycleDays,
          portToken: generatePortToken(),
          status: "active",
          channel: user.defaultChannel,
          channelKey: user.defaultChannelKey,
          userId,
        },
        select: { id: true },
      });
    });
    if (!sim)
      return NextResponse.json(
        { ok: false, error: "没有可用的保留提醒名额" },
        { status: 409 }
      );
    return NextResponse.json({ ok: true, simId: sim.id });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { ok: false, error: "该号码已存在" },
        { status: 409 }
      );
    }
    throw error;
  }
}

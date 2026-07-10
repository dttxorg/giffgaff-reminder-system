import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import {
  bucketForDay,
  dayOffsetFromBaseline,
  isInReminderWindow,
  shanghaiParts,
} from "@/lib/bucket";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  DayOffsetProgress,
  ReminderWindowAlert,
} from "./_components/day-offset-progress";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sim = user.sim;
  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const dayOffset = dayOffsetFromBaseline(baseline);
  const inWindow = isInReminderWindow(dayOffset);

  // M3: 最近 5 条发送给自己的提醒 — 透明度,用户能看见系统到底推过啥
  const recentReminders = await prisma.reminderSent.findMany({
    where: { simId: sim.id },
    orderBy: { sentAt: "desc" },
    take: 5,
    select: {
      id: true,
      dayOffset: true,
      bucket: true,
      sentAt: true,
      status: true,
    },
  });

  // 计算当前小时的 bucket(用于显示"今天第几次推送")
  const hourOfDay = shanghaiParts(new Date()).hour;
  const bucketInfo = bucketForDay(dayOffset, hourOfDay);

  const phoneTail4 = sim.phoneNumber.slice(-4);
  const channelMissing = !user.channelKey;

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4">
        <p className="text-sm text-slate-500">欢迎</p>
        <h1 className="text-2xl font-bold">用户 **** {phoneTail4}</h1>
      </div>

      {channelMissing && (
        <Link
          href="/me/settings"
          className="block mb-4 p-4 rounded-lg bg-rose-50 border-2 border-rose-300 hover:bg-rose-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="font-semibold text-rose-900">您还没设置通知渠道</div>
              <div className="text-sm text-rose-700 mt-0.5">
                没有通知渠道,系统无法在保号日给您发提醒。
                <span className="text-rose-900 underline ml-1">立即设置 →</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
        <div className="text-sm text-slate-500 mb-1">我的号码</div>
        <div className="text-2xl font-mono font-semibold mb-3 tracking-wider">
          {formatPhoneForDisplay(sim.phoneNumber)}
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-slate-500">激活日期</div>
          <Link
            href="/me/settings#sim-info"
            className="text-xs text-indigo-600 hover:underline"
          >
            修改
          </Link>
        </div>
        <div className="text-base mb-4">
          {sim.activatedAt.toISOString().slice(0, 10)}
          {sim.lastPortedAt && (
            <span className="ml-2 text-xs text-slate-500">
              (上次保号 {sim.lastPortedAt.toISOString().slice(0, 10)})
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-sm text-slate-500">已激活</span>
          <span className="text-3xl font-bold text-indigo-600">{dayOffset}</span>
          <span className="text-base font-normal text-slate-500">天</span>
        </div>
        <DayOffsetProgress dayOffset={dayOffset} />

        {inWindow && (
          <ReminderWindowAlert
            dayOffset={dayOffset}
            bucketInfo={bucketInfo}
          />
        )}

        {!inWindow && dayOffset > 180 && (
          <div className="mt-4 p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm">
            已超过 180 天,系统不再自动提醒。请尽快保号并提交新日期。
          </div>
        )}
      </div>

      <Link
        // 优先用 portToken(不可枚举);老 sim 可能还没有,fallback 到 id
        // (route handler 会自动 lazy-backfill 第一次访问时)
        href={`/p/${sim.portToken ?? sim.id}`}
        className="block w-full text-center py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm mb-3"
      >
        {inWindow ? "立即去保号" : "保号（更新日期）"}
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-slate-500">推送渠道</div>
          <Link
            href="/me/settings"
            className="text-xs text-indigo-600 hover:underline"
          >
            {channelMissing ? "去设置" : "修改"}
          </Link>
        </div>
        {channelMissing ? (
          <div className="text-base text-rose-600 font-medium">未设置</div>
        ) : (
          <>
            <div className="text-base mb-1">
              {user.channel === "serverchan"
                ? "Sever酱"
                : user.channel === "bark"
                ? "Bark"
                : user.channel === "pushplus"
                ? "pushplus"
                : "Telegram"}
            </div>
            <div className="text-xs text-slate-400 font-mono break-all">
              {user.channelKey.slice(0, 12)}****
            </div>
          </>
        )}
      </div>

      {/* M3: 最近发送给我的提醒 — 透明度,让用户知道系统到底推过啥 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-500">最近推送给我</div>
          <span className="text-xs text-slate-400">最多显示 5 条</span>
        </div>
        {recentReminders.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">
            {inWindow
              ? "本提醒窗口内还没有推送过(下次 cron 会尝试)"
              : "还没到提醒窗口(170 天起才会推送)"}
          </div>
        ) : (
          <ul className="text-sm divide-y divide-slate-100">
            {recentReminders.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-slate-700">
                    第 {r.dayOffset} 天 · 第 {r.bucket + 1} 桶
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {r.sentAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-xs ${
                    r.status === "success"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {r.status === "success" ? "送达" : "失败"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

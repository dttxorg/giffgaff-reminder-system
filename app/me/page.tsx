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
import { formatRelativeTime } from "@/lib/date";
import {
  DayOffsetProgress,
  ReminderWindowAlert,
} from "./_components/day-offset-progress";
import { PushPreview } from "@/app/_components/push-preview";
import { ChannelKeyReveal } from "./_components/channel-key-reveal";
import { CopyPhoneButton } from "./_components/copy-phone-button";
import { CopyPortLinkButton } from "./_components/copy-port-link-button";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sim = user.sim;
  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const dayOffset = dayOffsetFromBaseline(baseline);
  const inWindow = isInReminderWindow(dayOffset);

  // M3: 最近 5 条 + lifetime 总数(并行)
  // 总数让用户知道系统"一直在跑",透明度提升
  const [recentReminders, lifetimeCount, successCount, failedCount] = await Promise.all([
    prisma.reminderSent.findMany({
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
    }),
    prisma.reminderSent.count({ where: { simId: sim.id } }),
    prisma.reminderSent.count({
      where: { simId: sim.id, status: "success" },
    }),
    prisma.reminderSent.count({
      where: { simId: sim.id, status: "failed" },
    }),
  ]);
  // 推送成功率(默认 100% 避免除以 0;有 failed 才显示真实数字)
  const successRate =
    lifetimeCount > 0
      ? Math.round((successCount / lifetimeCount) * 100)
      : 100;

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
            <div className="shrink-0 w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-rose-600"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
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
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-slate-500">我的号码</div>
          <CopyPhoneButton phone={sim.phoneNumber} />
        </div>
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
          <span>{formatRelativeTime(sim.activatedAt)} 激活</span>
          {sim.lastPortedAt && (
            <span className="ml-2 text-xs text-slate-500">
              (上次保号 {formatRelativeTime(sim.lastPortedAt)})
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-sm text-slate-500">已激活</span>
          <span
            className={
              dayOffset > 180
                ? "text-3xl font-bold text-rose-600"
                : inWindow
                  ? "text-3xl font-bold text-amber-600"
                  : "text-3xl font-bold text-indigo-600"
            }
          >
            {dayOffset}
          </span>
          <span className="text-base font-normal text-slate-500">天</span>
        </div>
        <DayOffsetProgress dayOffset={dayOffset} />

        {inWindow && (
          <ReminderWindowAlert
            dayOffset={dayOffset}
            bucketInfo={bucketInfo}
          />
        )}

        {!inWindow && (
          <div className="mt-4 p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm">
            {dayOffset > 180 ? (
              <>已超过 180 天,系统不再自动提醒。请尽快保号并提交新日期。</>
            ) : (
              <>
                距提醒开始还有{" "}
                <strong className="text-slate-900">
                  {170 - dayOffset} 天
                </strong>
                ,提醒窗口 170-180 天。
              </>
            )}
          </div>
        )}
      </div>

      <Link
        // 优先用 portToken(不可枚举);老 sim 可能还没有,fallback 到 id
        // (route handler 会自动 lazy-backfill 第一次访问时)
        href={`/p/${sim.portToken ?? sim.id}`}
        className="block w-full text-center py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
      >
        {inWindow ? "立即去保号" : "保号（更新日期）"}
      </Link>
      {/* M4:按钮副标告诉用户会发生什么,避免点进去一脸懵 */}
      <p className="text-xs text-slate-500 text-center mb-3">
        选个最近一次保号的日期提交,系统从那天重新计时 170 天
      </p>
      {/* 复制保号链接:用户可分享给其他设备/家人 */}
      <div className="flex justify-center mb-3 -mt-2">
        <CopyPortLinkButton
          portUrl={
            typeof window !== "undefined"
              ? `${window.location.origin}/p/${sim.portToken ?? sim.id}`
              : `/p/${sim.portToken ?? sim.id}`
          }
        />
      </div>

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
            <ChannelKeyReveal channelKey={user.channelKey} />
          </>
        )}
      </div>

      {/* M3: 最近发送给我的提醒 — 透明度,让用户知道系统到底推过啥 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-sm text-slate-500">最近推送给我</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {lifetimeCount}
              <span className="text-sm font-normal text-slate-500 ml-1.5">条累计</span>
            </div>
            {lifetimeCount > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                送达率
                <strong
                  className={
                    successRate >= 95
                      ? "text-emerald-700"
                      : successRate >= 80
                        ? "text-amber-700"
                        : "text-rose-700"
                  }
                >
                  {successRate}%
                </strong>
                {failedCount > 0 && (
                  <span className="ml-1.5 text-rose-600">
                    ({failedCount} 条失败)
                  </span>
                )}
              </p>
            )}
          </div>
          <span className="text-xs text-slate-400">显示最近 5 条</span>
        </div>
        {/* 满了 5 条说明还有更多,提示用户历史量级 */}
        {recentReminders.length === 5 && lifetimeCount > 5 && (
          <p className="text-xs text-slate-500 -mt-2 mb-3">
            还有 <strong className="text-slate-700">{lifetimeCount - 5}</strong> 条历史提醒未显示
          </p>
        )}
        {recentReminders.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center flex flex-col items-center gap-2">
            <svg
              width={32}
              height={32}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-slate-300"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
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
                    <span className="text-slate-700">{formatRelativeTime(r.sentAt)}</span>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {r.sentAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                    </div>
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

      {/* M3 推送样例预览:让用户看到自己会收到什么内容 */}
      <details className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-4 group">
        <summary className="cursor-pointer list-none flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-indigo-600"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            查看推送样例
          </span>
          <span aria-hidden="true" className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <p className="text-xs text-slate-500 mt-2 mb-3">
          折叠打开,看系统到日子会给您发什么。
          {channelMissing && " 推送前需先设置通知渠道。"}
        </p>
        <PushPreview
          phoneNumber={sim.phoneNumber}
          days={dayOffset}
          portToken={sim.portToken}
          simIdFallback={sim.id}
        />
      </details>
    </div>
  );
}

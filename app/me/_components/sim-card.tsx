import Link from "next/link";
import {
  bucketForDay,
  dayOffsetFromBaseline,
  daysUntilReminderWindow,
  getMilestone,
  COUNTS,
  getAnniversaryProgress,
  getNextMilestone,
  isInReminderWindow,
  shanghaiParts,
} from "@/lib/bucket";
import { getSimReminderStats } from "@/lib/sim-reminder-stats";
import { getCachedReminderTemplate } from "@/lib/reminder-template-cache";
import { AnniversaryProgress } from "./anniversary-progress";
import { AnniversaryProgressBar } from "./anniversary-progress-bar";
import { MilestoneBanner } from "./milestone-banner";
import { NextMilestoneHint } from "./next-milestone-hint";
import { TodayHourlyChart } from "./today-hourly-chart";
import { MonthDailyChart } from "./month-daily-chart";
import { DaysUntilWindowCountdown } from "./days-until-window-countdown";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatActivatedDays } from "@/lib/activated-days";
import { formatRelativeTime, formatTimeGap } from "@/lib/date";
import {
  DayOffsetProgress,
  ReminderWindowAlert,
} from "./day-offset-progress";
import { PushPreview } from "@/app/_components/push-preview";
import { CopyPhoneButton } from "./copy-phone-button";
import { CopyPortLinkButton } from "./copy-port-link-button";

export interface SimCardProps {
  /** 该 SIM 卡的数据(必填) */
  sim: {
    id: number;
    phoneNumber: string;
    activatedAt: Date;
    lastPortedAt: Date | null;
    portToken: string | null;
    status: "active" | "paused";
    channel: "serverchan" | "bark" | "pushplus" | "telegram";
    channelKey: string;
  };
  /** 是否当前账号下的第一个 SIM(用于"主"标记) */
  isPrimary: boolean;
  /** 当前时间(从父组件传入,确保同一请求内多次渲染一致) */
  now: Date;
}

/**
 * 单张 SIM 卡的完整 UI(进度 / 提醒 / 推送预览)
 *
 * 包含该 sim 自己的所有 DB 查询,通过 props 接收 sim(本卡字段)。
 */
export async function SimCard({
  sim,
  isPrimary,
  now,
}: SimCardProps) {
  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const _daysFromRelative = (rel: string): number => {
    const m = rel.match(/^(\d+)\s*天/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const daysSinceActivated = _daysFromRelative(formatRelativeTime(sim.activatedAt));
  const daysSinceLastPorted = sim.lastPortedAt
    ? _daysFromRelative(formatRelativeTime(sim.lastPortedAt))
    : 0;
  const dayOffset = dayOffsetFromBaseline(baseline);
  const inWindow = isInReminderWindow(dayOffset);
  // Round 214: 距保号窗口距离(0/1/2 边界 + 170/180 窗口期)
  const windowDistance = daysUntilReminderWindow(dayOffset);
  // Round 214: 0/1/2 边缘"刚激活"徽标(从纯函数拿,与单测对齐)
  const activatedDisplay = formatActivatedDays(dayOffset);
  const milestone = getMilestone(dayOffset);
  const nextMilestone = milestone ? null : getNextMilestone(dayOffset);
  const anniversary = getAnniversaryProgress(dayOffset);

  // 推送详情统计与模板并行加载，避免号码切换时出现多轮数据库瀑布。
  const [reminderStats, reminderTemplate] = await Promise.all([
    getSimReminderStats(sim.id, now),
    getCachedReminderTemplate(),
  ]);
  const {
    recentReminders,
    lifetimeCount,
    successCount,
    failedCount,
    thisMonthCount,
    thisMonthFailedCount,
    todayCount,
    todayFailedCount,
    todayHourlySends,
    last7DaysForSim,
  } = reminderStats;
  const successRate =
    lifetimeCount > 0 ? Math.round((successCount / lifetimeCount) * 100) : 100;

  const sp = shanghaiParts(now);
  const hourOfDay = sp.hour;
  const bucketInfo = bucketForDay(dayOffset, hourOfDay);

  let thisMonthExpected = 0;
  for (let d = 1; d <= sp.day; d++) {
    const dayOffsetAtMonth = dayOffsetFromBaseline(
      new Date(Date.UTC(sp.year, sp.month - 1, d)),
      baseline
    );
    thisMonthExpected += COUNTS[dayOffsetAtMonth] ?? 0;
  }

  const channelMissing = !sim.channelKey;
  const portUrl = sim.portToken;
  const portHref = portUrl
    ? `/p/${portUrl}`
    : `/me/settings?simId=${sim.id}`;
  return (
    <div>
      {milestone && <MilestoneBanner milestone={milestone} />}

      {/* tabs 已在外层标识当前是哪张卡,这里不再重复显示 indexLabel */}

      {channelMissing && (
        <Link
          href={`/me/settings?simId=${sim.id}`}
          title="设置通知渠道(才能接收保号提醒)"
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
              <div className="font-semibold text-rose-900">该 SIM 卡还没设置通知渠道</div>
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
          <div className="text-sm text-slate-500 inline-flex items-center gap-1.5">
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-slate-400"
            >
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            {isPrimary ? "我的号码" : "该 SIM 卡号"}
          </div>
          <CopyPhoneButton phone={sim.phoneNumber} />
        </div>
        <div className="text-2xl font-mono font-semibold mb-3 tracking-wider">
          {formatPhoneForDisplay(sim.phoneNumber)}
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-slate-500">激活日期</div>
          <Link
            href={`/me/settings?simId=${sim.id}#sim-info`}
            title="修改激活日期或上次保号日期"
            className="text-xs text-indigo-600 hover:underline inline-flex items-center min-h-[44px] -ml-1 px-1"
          >
            修改
          </Link>
        </div>
        <div className="text-base mb-4">
          <span
            className="cursor-help inline-flex items-center gap-1"
            title={`激活于 ${new Date(sim.activatedAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}${sim.lastPortedAt ? `\n上次保号于 ${new Date(sim.lastPortedAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}\n\n修改记录: ${sim.lastPortedAt ? `${daysSinceLastPorted} 天前保号, ${daysSinceActivated} 天前激活` : `尚未保号, ${daysSinceActivated} 天前激活`}`}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-slate-400"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            激活日期 {new Date(sim.activatedAt).toLocaleDateString("zh-CN")}
          </span>
          {sim.lastPortedAt && (
            <span className="ml-2 text-xs text-slate-500">
              (上次保号{" "}
              <span
                className="cursor-help inline-flex items-center gap-0.5"
                title={new Date(sim.lastPortedAt).toLocaleString("zh-CN")}
              >
                <svg
                  width={11}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-slate-400"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatRelativeTime(sim.lastPortedAt)}
                <span className="text-slate-400 ml-1">
                  ({formatTimeGap(new Date(sim.lastPortedAt))})
                </span>
              </span>
              )
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <span className="text-sm text-slate-500">已激活</span>
          <span
            className={
              // Round 214: 颜色由 activatedDisplay.mode 决定(单测覆盖所有边界)
              activatedDisplay.mode === "overdue"
                ? "text-3xl font-bold text-rose-600"
                : activatedDisplay.mode === "fresh"
                  ? "text-3xl font-bold text-slate-500"
                  : activatedDisplay.mode === "inWindow"
                    ? "text-3xl font-bold text-amber-600"
                    : "text-3xl font-bold text-indigo-600"
            }
          >
            {dayOffset === 0 ? "今天" : dayOffset === 1 ? "昨天" : dayOffset === 2 ? "前天" : dayOffset}
          </span>
          <span className="text-base font-normal text-slate-500">天</span>
          {/* Round 214: 边缘标记 — 今天/昨天/前天加小绿点(从 activatedDisplay 拿) */}
          {activatedDisplay.showFreshBadge && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700"
              title={
                dayOffset === 0
                  ? "今天激活,系统会从 170 天后开始提醒保号"
                  : dayOffset === 1
                    ? "昨天激活,等待 170 天进入保号窗口"
                    : "前天激活,等待 170 天进入保号窗口"
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              刚激活
            </span>
          )}
          <Link
            href={`/me/pushes?simId=${sim.id}`}
            className="ml-2 text-xs text-indigo-600 hover:underline"
            title="查看完整推送历史"
          >
            推送历史 →
          </Link>
          {/* Round 214: 距保号窗口指示(0/1/2 边缘不显示,避免噪音) */}
          {windowDistance.kind === "before" && windowDistance.days > 2 && (
            <span
              className="ml-2 text-xs text-slate-500"
              title={`还有 ${windowDistance.days} 天进入 170 天保号提醒窗口`}
            >
              · 距保号窗口 <strong className="font-semibold text-slate-700">{windowDistance.days}</strong> 天
            </span>
          )}
          {windowDistance.kind === "after" && (
            <span
              className="ml-2 text-xs text-rose-600"
              title={`已过 180 天保号窗口 ${windowDistance.days} 天,建议尽快保号`}
            >
              · 已过保号窗口 <strong className="font-semibold">{windowDistance.days}</strong> 天
            </span>
          )}
          {anniversary.years === 0 && anniversary.daysLeft > 0 && anniversary.daysLeft < 365 && (
            <span
              className="ml-2 text-xs text-amber-700"
              title={`还有 ${anniversary.daysLeft} 天到 1 周年里程碑`}
            >
              · 距 1 周年 <strong className="font-semibold">{anniversary.daysLeft}</strong> 天
            </span>
          )}
          <span
            className="ml-2 text-xs text-slate-500"
            title={`系统累计推送 ${lifetimeCount} 次 (成功 ${successCount} 次, 失败 ${failedCount} 次)${
              (COUNTS[dayOffset] ?? 0) > 0
                ? `, 今日预期 ${COUNTS[dayOffset]} 次`
                : dayOffset > 180
                  ? ", 已超过提醒窗口"
                  : dayOffset < 170
                    ? ", 未到提醒窗口"
                    : ""
            }${365 - daysSinceActivated > 0 ? `, 距激活 1 周年 ${365 - daysSinceActivated} 天` : ""}`}
          >
            <Link
              href={`/me/pushes?simId=${sim.id}&status=success`}
              className="text-emerald-700 hover:underline"
            >
              {successCount} 次成功
            </Link>
            {(COUNTS[dayOffset] ?? 0) > 0 && (
              <span className="ml-1">/ 今日预期 {COUNTS[dayOffset]} 次</span>
            )}
            {365 - daysSinceActivated > 0 && (
              <span className="ml-1" title={`还有 ${365 - daysSinceActivated} 天到 1 周年`}>
                / 距 1 周年 {365 - daysSinceActivated} 天
              </span>
            )}
          </span>
          {nextMilestone && (
            <NextMilestoneHint milestone={nextMilestone.milestone} daysLeft={nextMilestone.daysLeft} />
          )}
          {anniversary.years >= 1 && <AnniversaryProgress progress={anniversary} />}
          {anniversary.years >= 1 && <AnniversaryProgressBar progress={anniversary} />}
        </div>
        <DayOffsetProgress dayOffset={dayOffset} />

        {inWindow && (
          <ReminderWindowAlert dayOffset={dayOffset} bucketInfo={bucketInfo} now={now} />
        )}

        {!inWindow && (
          <div className="mt-4 p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm">
            {dayOffset > 180 ? (
              <>
                已超过 180 天,系统不再自动提醒。请尽快保号并提交新日期。
                <Link
                  href={portHref}
                  title="打开保号页面提交新日期"
                  className="ml-2 inline-flex items-center text-indigo-600 hover:underline font-medium"
                >
                  立即去保号 →
                </Link>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="text-slate-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  距提醒开始还有{" "}
                </span>
                <strong className="text-slate-900">{170 - dayOffset} 天</strong>
                <DaysUntilWindowCountdown
                  targetDayOffset={170}
                  currentDayOffset={dayOffset}
                />
                ,提醒窗口 170-180 天。
              </>
            )}
          </div>
        )}
      </div>

      <Link
        href={portHref}
        title="打开保号页面,选一个日期提交即重置 170 天倒计时"
        className="block w-full text-center py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center justify-center gap-1.5"
      >
        {inWindow ? "立即去保号" : "保号(更新日期)"}
        <svg
          width={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
      <p className="text-xs text-slate-500 text-center mb-3">
        选个最近一次保号的日期提交,系统从那天重新计时 170 天
      </p>
      <div className="flex justify-center mb-3 -mt-2">
        <CopyPortLinkButton
          portUrl={
            typeof window !== "undefined"
              ? `${window.location.origin}${portHref}`
              : portHref
          }
        />
      </div>

      {/* 推送历史 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-4">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-sm text-slate-500">最近推送给我</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {lifetimeCount}
              <span className="text-sm font-normal text-slate-500 ml-1.5">条累计</span>
              {todayCount > 0 && (
                <details className="ml-2 inline-block">
                  <summary
                    className="text-sm font-normal text-slate-500 inline-flex items-center gap-1 cursor-pointer list-none"
                    title={`今日 (${sp.year}-${String(sp.month).padStart(2, "0")}-${String(sp.day).padStart(2, "0")}) 已推 ${todayCount} 条${todayFailedCount > 0 ? `, 失败 ${todayFailedCount} 条` : ""}${
                      (COUNTS[dayOffset] ?? 0) > 0
                        ? `, 今日预期 ${COUNTS[dayOffset]} 次 (提醒窗口 170-180 天)`
                        : dayOffset > 180
                          ? " (已超过提醒窗口,系统不再自动推送)"
                          : dayOffset < 170
                            ? " (提醒窗口 170-180 天,未到推送时间)"
                            : ""
                    }`}
                  >
                    · 今日{" "}
                    <strong className={todayFailedCount > 0 ? "text-amber-700" : "text-slate-700"}>
                      {todayCount}
                    </strong>{" "}
                    条
                    {todayFailedCount > 0 && (
                      <Link
                        href={`/me/pushes?simId=${sim.id}&from=${sp.year}-${String(sp.month).padStart(2, "0")}-${String(sp.day).padStart(2, "0")}&to=${sp.year}-${String(sp.month).padStart(2, "0")}-${String(sp.day).padStart(2, "0")}&status=failed`}
                        className="text-rose-600 ml-0.5 hover:underline"
                        title="查看今日失败推送"
                      >
                        (失败 {todayFailedCount})
                      </Link>
                    )}
                    <svg
                      width={10}
                      height={10}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="text-slate-400 ml-0.5 details-chevron"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <TodayHourlyChart hours={todayHourlySends} currentHour={sp.hour} />
                </details>
              )}
              {todayCount === 0 && thisMonthCount > 0 && (
                <details className="ml-2 inline-block">
                  <summary
                    className="text-sm font-normal text-slate-500 inline-flex items-center gap-1 cursor-pointer list-none"
                    title={`本月 (${sp.year}-${String(sp.month).padStart(2, "0")}) 已推 ${thisMonthCount} 条${thisMonthFailedCount > 0 ? `, 失败 ${thisMonthFailedCount} 条` : ""}${thisMonthExpected > 0 ? `, 本月预期 ${thisMonthExpected} 次` : ""}`}
                  >
                    · 本月 <strong className="text-slate-700">{thisMonthCount}</strong> 条
                    {thisMonthExpected > thisMonthCount && (
                      <span
                        className="ml-1 text-slate-500"
                        title={`本月预期 ${thisMonthExpected} 次, 已推 ${thisMonthCount} 次, 还差 ${thisMonthExpected - thisMonthCount} 次`}
                      >
                        (还差 {thisMonthExpected - thisMonthCount} 次)
                      </span>
                    )}
                    {thisMonthExpected > thisMonthCount && todayCount > 0 && (
                      <span
                        className="ml-1 text-slate-500"
                        title={`本月预期 ${thisMonthExpected} 次, 今日已推 ${todayCount} 次`}
                      >
                        (今日 {todayCount} / 预期 {thisMonthExpected})
                      </span>
                    )}
                    {thisMonthFailedCount > 0 && (
                      <Link
                        href={`/me/pushes?simId=${sim.id}&from=${sp.year}-${String(sp.month).padStart(2, "0")}-01&to=${sp.year}-${String(sp.month).padStart(2, "0")}-${new Date(sp.year, sp.month, 0).getUTCDate().toString().padStart(2, "0")}&status=failed`}
                        className="text-rose-600 ml-1 hover:underline"
                        title="查看本月失败推送"
                      >
                        (失败 {thisMonthFailedCount})
                      </Link>
                    )}
                    <svg
                      width={10}
                      height={10}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="text-slate-400 ml-0.5 details-chevron"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <MonthDailyChart days={last7DaysForSim} />
                  <Link
                    href={`/me/pushes?simId=${sim.id}`}
                    className="block mt-2 text-xs text-indigo-600 hover:underline"
                  >
                    查看完整推送历史 →
                  </Link>
                </details>
              )}
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
                  <span className="ml-1.5 text-rose-600">({failedCount} 条失败)</span>
                )}
              </p>
            )}
          </div>
          <span className="text-xs text-slate-400">显示最近 5 条</span>
        </div>
        {recentReminders.length === 5 && lifetimeCount > 5 && (
          <p
            className="text-xs text-slate-500 -mt-2 mb-3"
            title="完整记录只在管理员后台可见;普通用户只展示最近 5 条"
          >
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
            {inWindow ? "本提醒窗口内还没有推送过(下次 cron 会尝试)" : "还没到提醒窗口(170 天起才会推送)"}
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
                    <span className="text-slate-700" title={new Date(r.sentAt).toLocaleString("zh-CN")}>
                      {formatRelativeTime(r.sentAt)}
                    </span>
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

      {/* 推送样例预览 */}
      <details className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-4 group">
        <summary
          title="点击展开/折叠查看推送样例"
          className="cursor-pointer list-none flex items-center justify-between"
        >
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
          {channelMissing && (
            <>
              {" 推送前需先"}
              <Link
                href={`/me/settings?simId=${sim.id}`}
                className="text-indigo-600 hover:underline mx-0.5"
              >
                设置该 SIM 的通知渠道
              </Link>
              。
            </>
          )}
        </p>
        <PushPreview
          phoneNumber={sim.phoneNumber}
          days={dayOffset}
          portToken={sim.portToken}
          templateOverride={reminderTemplate}
        />
      </details>
    </div>
  );
}

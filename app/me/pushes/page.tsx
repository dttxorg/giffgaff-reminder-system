// Round 174+175: /me 推送历史完整列表页 (按日分组折叠)
// - Round 174: 完整推送列表 + 状态过滤
// - Round 175: 按日分组,每天是 <details> 默认展开,便于浏览

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatRelativeTime, formatUtcShanghaiDual } from "@/lib/date";
import { groupRemindersByDay } from "@/lib/push-grouping";
import {
  getPushHistoryWeekStart,
  summarizePushHistoryWeek,
} from "@/lib/push-history-stats";
import { PushSummaryCard } from "../_components/push-summary-card";
import { PushFrequencyStrip } from "../_components/push-frequency-strip";
import { EmptyPushes } from "../_components/empty-pushes";
import { HistoryFilterLink } from "../_components/history-filter-link";

interface PageProps {
  searchParams: Promise<{ status?: string; from?: string; to?: string; simId?: string }>;
}



export default async function MePushesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { status, from, to, simId: simIdParam } = await searchParams;

  // Round 198 + 199: 日期范围快捷链接所需变量
  // 本月 (本月 1 号到本月最后一天,或今天)
  // 本周 (周一到今天)
  // 上月 (上月 1 号到上月最后一天)
  // 本年 (今年 1 月 1 号到今天)
  const _monthEnd = new Date();
  const _year = _monthEnd.getFullYear();
  const _month = _monthEnd.getMonth() + 1;
  // 本月起止
  const monthStart = `${_year}-${String(_month).padStart(2, "0")}-01`;
  const _monthLastDay = new Date(_year, _month, 0).getDate();
  const monthEnd = `${_year}-${String(_month).padStart(2, "0")}-${String(_monthLastDay).padStart(2, "0")}`;
  // 本周起 (本周一)
  const _dayOfWeek = _monthEnd.getDay(); // 0 (Sun) - 6 (Sat)
  const _mondayOffset = _dayOfWeek === 0 ? 6 : _dayOfWeek - 1;
  const _weekStartDate = new Date(_monthEnd);
  _weekStartDate.setDate(_monthEnd.getDate() - _mondayOffset);
  const _weekStart = `${_weekStartDate.getFullYear()}-${String(_weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(_weekStartDate.getDate()).padStart(2, "0")}`;
  // 上月起止
  const _lastMonthStart = `${_year - (_month === 1 ? 1 : 0)}-${String(_month === 1 ? 12 : _month - 1).padStart(2, "0")}-01`;
  const _lastMonthLastDay = new Date(_year, _month - 1, 0).getDate();
  const _lastMonthEnd = `${_year - (_month === 1 ? 1 : 0)}-${String(_month === 1 ? 12 : _month - 1).padStart(2, "0")}-${String(_lastMonthLastDay).padStart(2, "0")}`;
  // 本年起 (今年 1 月 1 号)
  const _yearStart = `${_year}-01-01`;
  // Round 200 + 201: 近 7 / 30 / 90 日起
  const _7daysAgoDate = new Date(_monthEnd);
  _7daysAgoDate.setDate(_7daysAgoDate.getDate() - 7);
  const _7daysAgo = `${_7daysAgoDate.getFullYear()}-${String(_7daysAgoDate.getMonth() + 1).padStart(2, "0")}-${String(_7daysAgoDate.getDate()).padStart(2, "0")}`;
  const _30daysAgoDate = new Date(_monthEnd);
  _30daysAgoDate.setDate(_30daysAgoDate.getDate() - 30);
  const _30daysAgo = `${_30daysAgoDate.getFullYear()}-${String(_30daysAgoDate.getMonth() + 1).padStart(2, "0")}-${String(_30daysAgoDate.getDate()).padStart(2, "0")}`;
  const _90daysAgoDate = new Date(_monthEnd);
  _90daysAgoDate.setDate(_90daysAgoDate.getDate() - 90);
  const _90daysAgo = `${_90daysAgoDate.getFullYear()}-${String(_90daysAgoDate.getMonth() + 1).padStart(2, "0")}-${String(_90daysAgoDate.getDate()).padStart(2, "0")}`;
  // Round 208: 近 6 个月 (够覆盖两个保号周期)
  const _6monthsAgoDate = new Date(_monthEnd);
  _6monthsAgoDate.setDate(_6monthsAgoDate.getDate() - 180);
  const _6monthsAgo = `${_6monthsAgoDate.getFullYear()}-${String(_6monthsAgoDate.getMonth() + 1).padStart(2, "0")}-${String(_6monthsAgoDate.getDate()).padStart(2, "0")}`;
  // Round 210: 近 1 年 (365 天,看长期推送模式)
  const _1yearAgoDate = new Date(_monthEnd);
  _1yearAgoDate.setDate(_1yearAgoDate.getDate() - 365);
  const _1yearAgo = `${_1yearAgoDate.getFullYear()}-${String(_1yearAgoDate.getMonth() + 1).padStart(2, "0")}-${String(_1yearAgoDate.getDate()).padStart(2, "0")}`;

  const validStatus: "success" | "failed" | undefined =
    status === "success" || status === "failed" ? status : undefined;

  // Round 176: from/to 日期范围过滤 (yyyy-MM-dd 格式)
  // from 包含 00:00:00 UTC, to +1 天 排除 (跟 /admin/reminders 一致)
  const sentAtRange: { gte?: Date; lt?: Date } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    sentAtRange.gte = new Date(from + "T00:00:00Z");
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const lt = new Date(to + "T00:00:00Z");
    lt.setUTCDate(lt.getUTCDate() + 1);
    sentAtRange.lt = lt;
  }

  if (user.sims.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 text-center">
        <p className="text-slate-600">该账号下没有 SIM 卡数据</p>
        <Link href="/me" className="text-indigo-600 hover:underline mt-3 inline-block">返回用户中心</Link>
      </div>
    );
  }

  // 多 sim 场景:?simId=X 只查该 sim;否则查账号下所有 sim
  const ownedSimIds = user.sims.map((s) => s.id);
  const requestedSimId = simIdParam ? Number(simIdParam) : null;
  const filteredSimIds =
    requestedSimId && ownedSimIds.includes(requestedSimId)
      ? [requestedSimId]
      : ownedSimIds;

  const where = {
    simId: { in: filteredSimIds },
    ...(validStatus ? { status: validStatus } : {}),
    ...(sentAtRange.gte || sentAtRange.lt ? { sentAt: sentAtRange } : {}),
  };

  const chartSim =
    user.sims.find((sim) => sim.id === requestedSimId) ?? user.sims[0];
  const chartBaseline = chartSim.lastPortedAt ?? chartSim.activatedAt;
  const weekStart = getPushHistoryWeekStart(_monthEnd);

  // 列表与近 7 日轻量记录并行加载：从原来的 8 次查询、2 轮等待降为 2 次查询、1 轮等待。
  const [reminders, last7DayReminders] = await Promise.all([
    prisma.reminderSent.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 200,
    }),
    prisma.reminderSent.findMany({
      where: {
        simId: { in: filteredSimIds },
        sentAt: { gte: weekStart },
      },
      select: { sentAt: true },
      orderBy: { sentAt: "asc" },
    }),
  ]);

  const successCount = reminders.filter((r) => r.status === "success").length;
  const failedCount = reminders.filter((r) => r.status === "failed").length;
  const totalShown = reminders.length;

  const last7Days = summarizePushHistoryWeek(
    last7DayReminders,
    chartBaseline,
    _monthEnd
  );

  // Round 175: 按日分组(用 lib/push-grouping 纯函数,可测)
  const groups = groupRemindersByDay(reminders);
  const today = `${_monthEnd.getFullYear()}-${String(_monthEnd.getMonth() + 1).padStart(2, "0")}-${String(_monthEnd.getDate()).padStart(2, "0")}`;
  const commonDateFilters = [
    { label: "全部", href: "/me/pushes", active: !from && !to },
    { label: "今天", href: `/me/pushes?from=${today}&to=${today}`, active: from === today && to === today },
    { label: "近 7 日", href: `/me/pushes?from=${_7daysAgo}&to=${today}`, active: from === _7daysAgo },
    { label: "近 30 日", href: `/me/pushes?from=${_30daysAgo}&to=${today}`, active: from === _30daysAgo },
    { label: "近 90 日", href: `/me/pushes?from=${_90daysAgo}&to=${today}`, active: from === _90daysAgo },
    { label: "近 6 个月", href: `/me/pushes?from=${_6monthsAgo}&to=${today}`, active: from === _6monthsAgo },
  ];
  const moreDateFilters = [
    { label: "本周", href: `/me/pushes?from=${_weekStart}&to=${today}`, active: from === _weekStart },
    { label: "本月", href: `/me/pushes?from=${monthStart}&to=${monthEnd}`, active: from === monthStart && to === monthEnd },
    { label: "上月", href: `/me/pushes?from=${_lastMonthStart}&to=${_lastMonthEnd}`, active: from === _lastMonthStart && to === _lastMonthEnd },
    { label: "本年", href: `/me/pushes?from=${_yearStart}&to=${today}`, active: from === _yearStart },
    { label: "近 1 年", href: `/me/pushes?from=${_1yearAgo}&to=${today}`, active: from === _1yearAgo },
  ];
  const moreDateActive = moreDateFilters.some((filter) => filter.active);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4">
        <Link
          href="/me"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← 返回用户中心
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">推送历史</h1>

      {/* Round 220: 顶部推送统计概览(成功/失败/送达率) */}
      <PushSummaryCard
        totalShown={totalShown}
        successCount={successCount}
        failedCount={failedCount}
        activeSimId={requestedSimId}
      />

      {/* Round 223: 近 7 日推送频率迷你图 */}
      {totalShown > 0 && <PushFrequencyStrip data={last7Days} />}
      <p className="text-sm text-slate-500 mb-6">
        共 {totalShown} 条 ·{" "}
        <strong className="text-emerald-700">{successCount}</strong> 成功 ·{" "}
        <strong className={failedCount > 0 ? "text-rose-700" : "text-slate-500"}>
          {failedCount}
        </strong>{" "}
        失败
        {status && (
          <span className="ml-2 text-slate-400">
            (过滤: {status})
            {" · "}
            <Link prefetch={false} href="/me/pushes" className="text-indigo-600 hover:underline">
              清除
            </Link>
          </span>
        )}
        {(from || to) && (
          <span className="ml-2 text-slate-400">
            (日期: {from || "..."} → {to || "..."})
            {" · "}
            <Link prefetch={false} href="/me/pushes" className="text-indigo-600 hover:underline">
              清除
            </Link>
          </span>
        )}
      </p>

      <div className="mb-3 text-xs" role="group" aria-label="按日期筛选推送历史">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-slate-500">日期:</span>
          {commonDateFilters.map((filter) => (
            <HistoryFilterLink key={filter.label} {...filter} />
          ))}
          <details className="group" open={moreDateActive || undefined}>
            <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200">
              更多日期
              <span className="details-chevron text-slate-400" aria-hidden="true">⌄</span>
            </summary>
            <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
              {moreDateFilters.map((filter) => (
                <HistoryFilterLink key={filter.label} {...filter} />
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs" role="group" aria-label="按状态筛选推送历史">
        <span className="mr-1 text-slate-500">状态:</span>
        <HistoryFilterLink label="全部" href="/me/pushes" active={!status} />
        <HistoryFilterLink label="成功" href="/me/pushes?status=success" active={status === "success"} tone="success" />
        <HistoryFilterLink label="失败" href="/me/pushes?status=failed" active={status === "failed"} tone="failed" />
      </div>

      {groups.length === 0 ? (
        <EmptyPushes status={validStatus} hasDateFilter={!!(from || to)} />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {

            const dayFailed = g.reminders.filter((r) => r.status === "failed").length;
            return (
              <details
                key={g.dateKey}
                open
                className="bg-white rounded-xl border border-slate-200"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{g.label}</span>
                  <span className="text-xs text-slate-500">
                    {g.reminders.length} 条
                    {dayFailed > 0 ? (
                      <span className="ml-1 text-rose-600">· {dayFailed} 失败</span>
                    ) : (
                      <span className="ml-1 text-emerald-600">· 全部成功</span>
                    )}
                  </span>
                </summary>
                <ul className="border-t border-slate-100 divide-y divide-slate-100">
                  {g.reminders.map((r) => (
                    <li key={r.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-500">
                          {formatRelativeTime(r.sentAt)}
                        </span>
                        <span
                          className={
                            r.status === "success"
                              ? "px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800"
                              : "px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800"
                          }
                        >
                          {r.status === "success" ? "送达" : "失败"}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700">
                        保号第 {r.dayOffset} 天 · 第 {r.bucket + 1} 次
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {formatUtcShanghaiDual(r.sentAt)}
                      </div>
                      {r.errorMessage && (
                        <div className="mt-2 text-xs text-rose-700 bg-rose-50 rounded p-2 break-words">
                          {r.errorMessage}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { formatRelativeTime, formatUtcShanghaiDual } from "@/lib/date";
import { dayOffsetFromBaseline } from "@/lib/bucket";
import { Last7DaysDetail } from "./_components/last-7-days-detail";
import { Last30DaysSends } from "./_components/last-30-days-sends";
import { Last90DaysSends } from "./_components/last-90-days-sends";
import { AdminStat } from "./_components/admin-stat";
import { TodayChannelStats } from "./_components/today-channel-stats";
import { Last7DaysChannelStats } from "./_components/last-7-days-channel-stats";
import { SimStatusBreakdown } from "./_components/sim-status-breakdown";
import { InWindowSims } from "./_components/in-window-sims";
import { TodayFailingSims } from "./_components/today-failing-sims";
import { TopActiveSims } from "./_components/top-active-sims";
import { TopFailingSims } from "./_components/top-failing-sims";
import { getChannelStatsLast7Days, getChannelStatsLast90Days, getInWindowSims, getLast30DaysSends, getLast7DaysBindRate, getLast7DaysNewSims, getLast7DaysNewUsers, getActiveSimStats, getLast7DaysUserBindRate, getPausedSimStats, getLast90DaysSends, getSimStatusBreakdown, getTodayChannelStats, getTodayFailingSims, getTopActiveSims, getTopFailingSims } from "@/lib/admin-reminder-stats";

export default async function AdminDashboard() {
  await requireAdmin();

  // 上海时区的"今天" 0 点
  const { shanghaiParts } = await import("@/lib/bucket");
  const now = new Date();
  const sp = shanghaiParts(now);
  const todayStartUTC = new Date(Date.UTC(sp.year, sp.month - 1, sp.day));
  // 昨日 0 点(用于 vs 昨日对比)
  const yesterdayStartUTC = new Date(todayStartUTC.getTime() - 24 * 60 * 60 * 1000);

  // D1: 7 天每日发送数(给 sparkline 用,从今天倒数 7 天)
  // Round 146: 同步算 (date, count) 给详细列表用
  const last7DaysData = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const dayStart = new Date(todayStartUTC.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await prisma.reminderSent.count({
        where: { sentAt: { gte: dayStart, lt: dayEnd } },
      });
      return {
        // 0-6 表示"6 天前到今天"
        offset: 6 - i,
        // 用 sp 算相对日期标签
        date: new Date(dayStart.getTime() + 12 * 60 * 60 * 1000), // +12h 防时区抖动
        count,
      };
    })
  );
  const last7DaysSends = last7DaysData.map((d) => d.count);

  // 算每个 sim 的 dayOffset(只取 status=active),O(N) 但小系统可接受
  // future 7 天会进窗口:now + 7 天时 dayOffset 首次达到 170 的 sim
  // eslint-disable-next-line react-hooks/purity -- server component,Date.now() 安全
  const nowMs = Date.now();
  const inWindowSimCount = await (async () => {
    const sims = await prisma.sim.findMany({
      where: { status: "active" },
      select: { activatedAt: true, lastPortedAt: true },
    });
    return sims.filter((s) => {
      const baseline = s.lastPortedAt ?? s.activatedAt;
      const days = dayOffsetFromBaseline(baseline, new Date(nowMs));
      // 在 170-180 窗口内,或未来 7 天内将进入窗口
      return days >= 170 && days <= 180;
    }).length;
  })();

  const [
    simCount,
    activeSimCount,
    pausedSimCount,
    userCount,
    channelCount,
    todaySent,
    todayFailed,
    failedRecent,
    yesterdaySent,
  ] = await Promise.all([
    prisma.sim.count(),
    prisma.sim.count({ where: { status: "active" } }),
    prisma.sim.count({ where: { status: "paused" } }),
    prisma.user.count(),
    // 1:N - 渠道在 sim 上,数 sim.channelKey 非空的数量
    prisma.sim.count({ where: { channelKey: { not: "" } } }),
    prisma.reminderSent.count({
      where: { sentAt: { gte: todayStartUTC } },
    }),
    prisma.reminderSent.count({
      where: { status: "failed", sentAt: { gte: todayStartUTC } },
    }),
    prisma.reminderSent.count({
      where: {
        status: "failed",
        sentAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.reminderSent.count({
      where: {
        sentAt: { gte: yesterdayStartUTC, lt: todayStartUTC },
      },
    }),
  ]);

  const recent = await prisma.reminderSent.findMany({
    take: 10,
    orderBy: { sentAt: "desc" },
    include: { sim: true, user: true },
  });

  // Round 140: 今日按渠道统计(给"今日按渠道"卡片用)
  const todayChannelStats = await getTodayChannelStats(todayStartUTC);

  // Round 141: 7 日失败 top 3 sim(给"top failing"卡片用)
  const topFailingSims = await getTopFailingSims(7, 3);

  // Round 160: 7 日推送 top 5 sim(给"top active"卡片用,跟 top failing 镜像)
  const topActiveSims = await getTopActiveSims(7, 5);

  // Round 163: 90 日推送 top 5 sim(更长期活跃 sim 排行)
  const topActiveSims90d = await getTopActiveSims(90, 5);

  // Round 164: 今日失败 sim 列表(给"今日失败 sim"卡用)
  const todayFailingSims = await getTodayFailingSims(todayStartUTC);

  // Round 165: 近 7 日按 channel 统计(给"近 7 日按 channel"卡用)
  const channelStatsLast7Days = await getChannelStatsLast7Days();

  // Round 167: 近 90 日按 channel 统计(给"近 90 日按 channel"卡用)
  const channelStatsLast90Days = await getChannelStatsLast90Days();

  // Round 149: 近 30 日每日发送数(给 30 日 mini bar 用)
  const last30DaysSends = await getLast30DaysSends();

  // Round 156: 近 90 日每日发送数(给 90 日更紧凑 mini bar 用)
  const last90DaysSends = await getLast90DaysSends();

  // Round 151: 提醒窗口内 sim 列表(给"提醒窗口内 sim 列表"卡用)
  const inWindowSims = await getInWindowSims(10);

  // Round 152+157+171: sim 状态 + 近 7 日新增 sim/user 统计(给"sim 状态"卡用)
  const [simStatusBreakdown, newSimsLast7Days, newUsersLast7Days, bindRateLast7Days, userBindRateLast7Days, pausedSimStats, activeSimStats] = await Promise.all([
    getSimStatusBreakdown(),
    // Round 157: 近 7 日新增 sim 统计
    getLast7DaysNewSims(),
    // Round 171: 近 7 日新增 user 统计
    getLast7DaysNewUsers(),
    // Round 172: 近 7 日绑定率历史
    getLast7DaysBindRate(),
    // Round 193: 近 7 日用户绑定率历史(镜像 sim 绑定率)
    getLast7DaysUserBindRate(),
    // Round 203: 近 7 日暂停 sim 统计
    getPausedSimStats(),
    // Round 204: 近 7 日激活 sim 统计
    getActiveSimStats(),
  ]);

  const channelCoverage = simCount > 0 ? Math.round((channelCount / simCount) * 100) : 0;

  // D1: 计算 vs 昨日 delta
  const sentDelta = todaySent - yesterdaySent;
  const sendDeltaLabel =
    yesterdaySent === 0
      ? "首次统计"
      : sentDelta === 0
      ? "与昨日持平"
      : sentDelta > 0
      ? `↑ 比昨日多 ${sentDelta}`
      : `↓ 比昨日少 ${Math.abs(sentDelta)}`;
  const sendDeltaTone =
    sentDelta > 0 ? "indigo" : sentDelta < 0 ? "amber" : "slate";

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      {/* 核心数据 — 6 个 stat */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <AdminStat
          label="号码总数"
          value={simCount}
          sub={`active ${activeSimCount} · paused ${pausedSimCount}`}
          href="/admin/sims"
        />
        <AdminStat
          label="已绑定渠道"
          value={`${channelCount}/${simCount}`}
          sub={simCount > 0 ? `覆盖率 ${channelCoverage}%` : "—"}
          tone={channelCoverage >= 80 ? "indigo" : channelCoverage >= 50 ? "amber" : "rose"}
          href="/admin/sims?bound=yes"
        />
        <AdminStat
          label="用户数"
          value={userCount}
          sub={simCount > 0 ? `绑定率 ${Math.round((userCount / simCount) * 100)}%` : "—"}
          href="/admin/users"
        />
        <AdminStat
          label="今日发送"
          value={todaySent}
          tone="indigo"
          sub={sendDeltaLabel}
          subTone={sendDeltaTone}
          href="/admin/reminders"
        />
        <AdminStat
          label="今日失败"
          value={todayFailed}
          tone={todayFailed > 0 ? "rose" : "slate"}
          sub={todayFailed > 0 ? `7 天累计 ${failedRecent}` : "全部成功"}
          href="/admin/reminders?status=failed"
        />
        <AdminStat
          label="提醒窗口内"
          value={inWindowSimCount}
          tone={inWindowSimCount > 0 ? "amber" : "slate"}
          sub={simCount > 0 ? `占 ${Math.round((inWindowSimCount / simCount) * 100)}%` : "—"}
          href="/admin/sims?status=active"
        />
        <AdminStat label="卡密未用" value={undefined} sub="在 卡密管理 查看" />
        {/* Round 169: 30 日 + 90 日总推送对比(扩展时间窗口) */}
        <AdminStat
          label="近 30 日推送"
          value={last30DaysSends.reduce((a: number, b) => a + b.count, 0)}
          tone="emerald"
        />
        <AdminStat
          label="近 90 日推送"
          value={last90DaysSends.reduce((a: number, b) => a + b.count, 0)}
          tone="emerald"
        />
      </div>

      {/* Round 152: sim 状态分布(总览健康度) */}
      <SimStatusBreakdown stats={simStatusBreakdown} newSimsLast7Days={newSimsLast7Days} newUsersLast7Days={newUsersLast7Days} bindRateLast7Days={bindRateLast7Days} userBindRateLast7Days={userBindRateLast7Days} pausedSimStats={pausedSimStats} activeSimStats={activeSimStats} />

      {/* Round 140+141+151: 仪表盘 3 个排查卡 (grid 2 列) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Round 173: 默认按失败率倒序 (不健康排前) */}
        <TodayChannelStats stats={todayChannelStats} />
        {/* Round 189: 同一数据按总推送数倒序 (高频优先) */}
        <TodayChannelStats stats={todayChannelStats} sortBy="total" />
        <TopFailingSims sims={topFailingSims} />
        {/* Round 165: 近 7 日按 channel 统计(短期 + 中期 channel 健康度) */}
        <Last7DaysChannelStats stats={channelStatsLast7Days} sortBy="failRate" days={7} />
        {/* Round 167: 90 日 channel 失败率排行(更长期) */}
        <Last7DaysChannelStats stats={channelStatsLast90Days} sortBy="failRate" days={90} />
        {/* Round 160: 7 日推送 top 5 sim(跟 top failing 并排) */}
        <TopActiveSims sims={topActiveSims} days={7} />
        <TopActiveSims sims={topActiveSims90d} days={90} />
        <TodayFailingSims sims={todayFailingSims} />
        <div className="md:col-span-2">
          <InWindowSims sims={inWindowSims} />
        </div>
      </div>

      {/* D1: 7 日发送趋势 sparkline + 卡片总数对比 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-slate-700">最近 7 日发送趋势</div>
            <div className="text-xs text-slate-500 mt-0.5">
              含今日 · 7 天累计 {last7DaysSends.reduce((a, b) => a + b, 0)} 条推送
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" aria-hidden="true" />
              <span>发送</span>
            </span>
          </div>
        </div>
        <Sparkline values={last7DaysSends} />
        {/* Round 146: 近 7 日详细列表(sparkline 下面) */}
        <Last7DaysDetail days={last7DaysData} />

        {/* Round 149: 近 30 日 mini bar(更长期趋势) */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-xs text-slate-500">
              近 30 日每日发送
              <span className="ml-2 text-slate-400">
                30 天累计 {last30DaysSends.reduce((a: number, b) => a + b.count, 0)} 条
              </span>
            </div>
          </div>
          <Last30DaysSends days={last30DaysSends} />

          {/* Round 156: 近 90 日更紧凑 mini bar(超长期趋势) */}
          <div className="flex items-baseline justify-between mb-1 mt-3">
            <div className="text-xs text-slate-500">
              近 90 日每日发送
              <span className="ml-2 text-slate-400">
                90 天累计 {last90DaysSends.reduce((a: number, b) => a + b.count, 0)} 条
              </span>
            </div>
          </div>
          <Last90DaysSends days={last90DaysSends} />
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="text-sm font-medium text-slate-700 mb-3">快捷入口</div>
        <div className="flex flex-wrap gap-2">
          <QuickLink href="/admin/sims/new" label="+ 新增号码" primary />
          <QuickLink href="/admin/cards/new" label="+ 生成卡密" />
          <QuickLink href="/admin/sims" label="号码列表" />
          <QuickLink href="/admin/cards" label="卡密列表" />
          <QuickLink href="/admin/users" label="用户列表" />
          <QuickLink href="/admin/reminders" label="提醒日志" />
          <QuickLink href="/admin/settings" label="文案设置" />
        </div>
      </div>

      {/* 最近发送日志 + "查看全部" */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="font-medium">最近发送日志</span>
          <Link
            href="/admin/reminders"
            className="text-xs text-indigo-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-400 text-sm">
            暂无发送记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">时间 (UTC)</th>
                  <th className="text-left px-3 py-2">号码</th>
                  <th className="text-left px-3 py-2">day/bucket</th>
                  <th className="text-left px-3 py-2">状态</th>
                  <th className="text-left px-3 py-2 min-w-[200px]">错误</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      <div className="text-slate-700">{formatRelativeTime(r.sentAt)}</div>
                      <div
                        className="text-slate-500 font-mono text-[10px]"
                        title={r.sentAt.toISOString()}
                      >
                        {formatUtcShanghaiDual(r.sentAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      <Link
                        href={`/admin/sims/${r.simId}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {r.sim.phoneNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      d{r.dayOffset}/b{r.bucket}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          r.status === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700 max-w-md break-words">
                      {r.errorMessage || <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



function QuickLink({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          : "inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
      }
    >
      {label}
    </Link>
  );
}

/**
 * 7 格 sparkline:每条 24px,间距 4px,无依赖的纯 SVG
 * - 比例尺自动按数组最大值归一
 * - 单元格底部加 baseline,空日子(0) 也显示薄线
 * - 用 aria-label 给屏幕阅读器一个概括
 */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values); // 防止除零
  const gap = 4;
  const barW = 24;
  const height = 64;
  const totalW = values.length * (barW + gap) - gap;

  return (
    <div
      className="overflow-x-auto"
      role="img"
      aria-label={`最近 7 日发送量,每天 ${values.join("、")} 条`}
    >
      <svg
        width={totalW}
        height={height + 32}
        viewBox={`0 0 ${totalW} ${height + 32}`}
        className="block"
      >
        {/* baseline */}
        <line
          x1={0}
          y1={height + 1}
          x2={totalW}
          y2={height + 1}
          stroke="currentColor"
          strokeOpacity={0.1}
        />
        {values.map((v, i) => {
          const h = v === 0 ? 2 : Math.max(2, Math.round((v / max) * height));
          const x = i * (barW + gap);
          const y = height - h + 1;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill="#4f46e5"
                opacity={v === 0 ? 0.25 : 1}
              />
              <text
                x={x + barW / 2}
                y={height + 18}
                fontSize={11}
                fill="currentColor"
                textAnchor="middle"
                opacity={0.5}
              >
                {v}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

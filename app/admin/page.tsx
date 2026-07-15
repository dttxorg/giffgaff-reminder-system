import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { formatRelativeTime, formatUtcShanghaiDual } from "@/lib/date";
import { getAdminDashboardData } from "@/lib/admin-dashboard-data";
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

export default async function AdminDashboard() {
  await requireAdmin();

  const now = new Date();
  const {
    simCount,
    activeSimCount,
    pausedSimCount,
    userCount,
    channelCount,
    todaySent,
    todayFailed,
    failedRecent,
    yesterdaySent,
    recent,
    last7DaysData,
    last30DaysSends,
    last90DaysSends,
    todayChannelStats,
    topFailingSims,
    topActiveSims,
    topActiveSims90d,
    todayFailingSims,
    channelStatsLast7Days,
    channelStatsLast90Days,
    inWindowSimCount,
    inWindowSims,
    simStatusBreakdown,
    newSimsLast7Days,
    newUsersLast7Days,
    bindRateLast7Days,
    userBindRateLast7Days,
    pausedSimStats,
    activeSimStats,
  } = await getAdminDashboardData(now);
  const last7DaysSends = last7DaysData.map((day) => day.count);

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
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

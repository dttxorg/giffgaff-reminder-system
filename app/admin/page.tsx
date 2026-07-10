import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { formatRelativeTime, formatUtcShanghaiDual } from "@/lib/date";
import { AdminStat } from "./_components/admin-stat";

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
  const last7DaysSends = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(todayStartUTC.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      return prisma.reminderSent.count({
        where: { sentAt: { gte: dayStart, lt: dayEnd } },
      });
    })
  );

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
    prisma.user.count({ where: { channelKey: { not: "" } } }),
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
        />
        <AdminStat
          label="已绑定渠道"
          value={`${channelCount}/${simCount}`}
          sub={simCount > 0 ? `覆盖率 ${channelCoverage}%` : "—"}
          tone={channelCoverage >= 80 ? "indigo" : channelCoverage >= 50 ? "amber" : "rose"}
        />
        <AdminStat
          label="用户数"
          value={userCount}
          sub={simCount > 0 ? `绑定率 ${Math.round((userCount / simCount) * 100)}%` : "—"}
        />
        <AdminStat
          label="今日发送"
          value={todaySent}
          tone="indigo"
          sub={sendDeltaLabel}
          subTone={sendDeltaTone}
        />
        <AdminStat
          label="今日失败"
          value={todayFailed}
          tone={todayFailed > 0 ? "rose" : "slate"}
          sub={todayFailed > 0 ? `7 天累计 ${failedRecent}` : "全部成功"}
        />
        <AdminStat label="卡密未用" value={undefined} sub="在 卡密管理 查看" />
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

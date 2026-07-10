import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  await requireAdmin();

  // 上海时区的"今天" 0 点
  const { shanghaiParts } = await import("@/lib/bucket");
  const now = new Date();
  const sp = shanghaiParts(now);
  const todayStartUTC = new Date(Date.UTC(sp.year, sp.month - 1, sp.day));

  const [simCount, activeSimCount, pausedSimCount, userCount, channelCount, todaySent, todayFailed, failedRecent] =
    await Promise.all([
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
      // 最近 7 天的失败数,给 stat 用
      prisma.reminderSent.count({
        where: {
          status: "failed",
          sentAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  const recent = await prisma.reminderSent.findMany({
    take: 10,
    orderBy: { sentAt: "desc" },
    include: { sim: true, user: true },
  });

  const channelCoverage = simCount > 0 ? Math.round((channelCount / simCount) * 100) : 0;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      {/* 核心数据 — 6 个 stat,active 占比凸显系统状态 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <Stat label="号码总数" value={simCount} sub={`active ${activeSimCount} · paused ${pausedSimCount}`} />
        <Stat
          label="已绑定渠道"
          value={`${channelCount}/${simCount}`}
          sub={simCount > 0 ? `覆盖率 ${channelCoverage}%` : "—"}
          tone={channelCoverage >= 80 ? "indigo" : channelCoverage >= 50 ? "amber" : "rose"}
        />
        <Stat label="用户数" value={userCount} />
        <Stat label="今日发送" value={todaySent} tone="indigo" />
        <Stat
          label="今日失败"
          value={todayFailed}
          tone={todayFailed > 0 ? "rose" : "slate"}
          sub={todayFailed > 0 ? `7 天累计 ${failedRecent}` : "全部成功"}
        />
        <Stat label="卡密未用" value={undefined} sub="在 卡密管理 查看" />
      </div>

      {/* 快捷入口 — 一键触达常见任务,免去多级跳转 */}
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
                  <th className="text-left px-3 py-2">错误</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {r.sentAt.toISOString().replace("T", " ").slice(0, 19)}
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

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string | undefined;
  sub?: string;
  tone?: "indigo" | "amber" | "rose" | "slate";
}) {
  const toneClass =
    tone === "indigo"
      ? "text-indigo-600"
      : tone === "amber"
      ? "text-amber-600"
      : tone === "rose"
      ? "text-rose-600"
      : tone === "slate"
      ? "text-slate-500"
      : "text-slate-900";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${toneClass}`}>
        {value === undefined ? "—" : value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
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

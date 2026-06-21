import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  await requireAdmin();

  const [simCount, userCount, todaySent, todayFailed] = await Promise.all([
    prisma.sim.count(),
    prisma.user.count(),
    prisma.reminderSent.count({
      where: {
        sentAt: {
          gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.reminderSent.count({
      where: {
        status: "failed",
        sentAt: {
          gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  const recent = await prisma.reminderSent.findMany({
    take: 10,
    orderBy: { sentAt: "desc" },
    include: { sim: true, user: true },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat label="号码总数" value={simCount} />
        <Stat label="用户数" value={userCount} />
        <Stat label="今日发送" value={todaySent} tone="indigo" />
        <Stat label="今日失败" value={todayFailed} tone="rose" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 font-medium">最近发送日志</div>
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
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    暂无发送记录
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.sentAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.sim.phoneNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      d{r.dayOffset}/b{r.bucket}
                    </td>
                    <td className="px-3 py-2">
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
                    <td className="px-3 py-2 text-xs text-slate-500 max-w-xs truncate">
                      {r.errorMessage || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "indigo" | "rose" }) {
  const toneClass =
    tone === "indigo" ? "text-indigo-600" : tone === "rose" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

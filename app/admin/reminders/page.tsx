import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

interface PageProps {
  searchParams: Promise<{ simId?: string; status?: string }>;
}

export default async function RemindersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { simId, status } = await searchParams;

  const where: { simId?: number; status?: "success" | "failed" } = {};
  if (simId) where.simId = parseInt(simId, 10);
  if (status === "success" || status === "failed") where.status = status;

  const reminders = await prisma.reminderSent.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 200,
    include: { sim: true, user: true },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">提醒日志</h1>

      <form className="mb-4 flex gap-2 flex-wrap">
        <input
          name="simId"
          defaultValue={simId}
          placeholder="simId"
          type="number"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-32 focus:border-indigo-500 outline-none"
        />
        <select
          name="status"
          defaultValue={status || ""}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        >
          <option value="">全部状态</option>
          <option value="success">success</option>
          <option value="failed">failed</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          搜索
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">时间 (UTC)</th>
                <th className="text-left px-3 py-2">号码</th>
                <th className="text-left px-3 py-2">day/bucket</th>
                <th className="text-left px-3 py-2">状态</th>
                <th className="text-left px-3 py-2">错误</th>
              </tr>
            </thead>
            <tbody>
              {reminders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    暂无日志
                  </td>
                </tr>
              ) : (
                reminders.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.id}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.sentAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <Link href={`/admin/sims/${r.simId}`} className="text-indigo-600 hover:underline">
                        {r.sim.phoneNumber}
                      </Link>
                    </td>
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

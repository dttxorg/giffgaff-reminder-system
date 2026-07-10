import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { ResendButton } from "./_components/resend-button";

interface PageProps {
  searchParams: Promise<{
    simId?: string;
    q?: string;
    status?: string;
    /** ISO 日期 (yyyy-MM-dd),按 sentAt 区间过滤 */
    from?: string;
    to?: string;
  }>;
}

export default async function RemindersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { simId, q, status, from, to } = await searchParams;

  const where: {
    simId?: number | { in: number[] };
    status?: "success" | "failed";
  } = {};
  if (simId) where.simId = parseInt(simId, 10);
  if (q) {
    // 按手机号模糊匹配(支持后 6 位、含空格/横线、完整号)
    const cleaned = normalizePhone(q);
    const matchedSims = await prisma.sim.findMany({
      where: { phoneNumber: { contains: cleaned || q } },
      select: { id: true },
      take: 200,
    });
    if (matchedSims.length === 0) {
      return (
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold mb-6">提醒日志</h1>
          <SearchForm simId={simId} q={q} status={status} from={from} to={to} />
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            没有找到匹配 &quot;{q}&quot; 的号码
          </div>
        </div>
      );
    }
    const ids = matchedSims.map((s) => s.id);
    if (where.simId) {
      const sid = where.simId as number;
      where.simId = ids.includes(sid) ? sid : { in: [] };
    } else {
      where.simId = { in: ids };
    }
  }
  if (status === "success" || status === "failed") where.status = status;

  const reminders = await prisma.reminderSent.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 200,
    include: { sim: true, user: true },
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">提醒日志</h1>
        <a
          href={`/api/admin/reminders/export${buildExportQS(simId, q, status, from, to)}`}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          ⬇ 导出 CSV
        </a>
      </div>

      <SearchForm simId={simId} q={q} status={status} from={from} to={to} />

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
                <th className="text-left px-3 py-2 min-w-[200px]">错误</th>
                <th className="text-left px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {reminders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    暂无日志
                  </td>
                </tr>
              ) : (
                reminders.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.id}</td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {r.sentAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      <Link href={`/admin/sims/${r.simId}`} className="text-indigo-600 hover:underline">
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
                    {/* 错误信息不再 truncate:admin 排错需要完整文本;
                        改为 max-w + break-words 保留可读性同时控制列宽 */}
                    <td className="px-3 py-2 text-xs text-slate-700 max-w-md break-words">
                      {r.errorMessage || (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <ResendButton reminderId={r.id} />
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

function SearchForm({
  simId,
  q,
  status,
  from,
  to,
}: {
  simId?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  // 显示"清除"快捷链接 — 当任一筛选生效时
  const hasFilter = !!(simId || q || status || from || to);
  return (
    <form className="mb-4 flex gap-2 flex-wrap items-center">
      <input
        name="simId"
        defaultValue={simId}
        placeholder="simId"
        type="number"
        className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-24 focus:border-indigo-500 outline-none"
      />
      <input
        name="q"
        defaultValue={q}
        placeholder="手机号（支持后 6 位）"
        inputMode="numeric"
        className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-48 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
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
      <input
        name="from"
        defaultValue={from}
        placeholder="起始日期"
        type="date"
        className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
      />
      <span className="text-slate-400">→</span>
      <input
        name="to"
        defaultValue={to}
        placeholder="结束日期"
        type="date"
        className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
      >
        搜索
      </button>
      {hasFilter && (
        <Link
          href="/admin/reminders"
          className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
        >
          清除
        </Link>
      )}
    </form>
  );
}

/**
 * 构造 export API 的 query string,保留当前页面的所有筛选条件
 * admin 点击"导出 CSV"时复用同样的筛选,获取相同的子集
 */
function buildExportQS(
  simId: string | undefined,
  q: string | undefined,
  status: string | undefined,
  from: string | undefined,
  to: string | undefined
): string {
  const sp = new URLSearchParams();
  if (simId) sp.set("simId", simId);
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  const s = sp.toString();
  return s ? "?" + s : "";
}

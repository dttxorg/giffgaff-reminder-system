import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { formatRelativeTime, formatUtcShanghaiDual } from "@/lib/date";
import { shanghaiParts } from "@/lib/bucket";
import { AdminStat } from "../_components/admin-stat";
import { Pagination } from "../_components/pagination";
import { ResendButton } from "./_components/resend-button";

interface PageProps {
  searchParams: Promise<{
    simId?: string;
    q?: string;
    status?: string;
    /** ISO 日期 (yyyy-MM-dd),按 sentAt 区间过滤 */
    from?: string;
    to?: string;
    /** 当前页码,默认 1 */
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

/**
 * 用与 /admin/sims 页面相同的筛选参数构造 where。
 * 复制一份以保持导出 API 独立(便于以后改格式不影响查询逻辑)。
 */
async function buildWhere(params: URLSearchParams) {
  const where: {
    simId?: number | { in: number[] };
    status?: "success" | "failed";
    sentAt?: { gte?: Date; lt?: Date };
  } = {};
  const simId = params.get("simId");
  const q = params.get("q");
  const status = params.get("status");

  if (simId) where.simId = parseInt(simId, 10);

  if (q) {
    const cleaned = normalizePhone(q);
    const matchedSims = await prisma.sim.findMany({
      where: { phoneNumber: { contains: cleaned || q } },
      select: { id: true },
      take: 200,
    });
    const ids = matchedSims.map((s) => s.id);
    if (where.simId) {
      const sid = where.simId as number;
      where.simId = ids.includes(sid) ? sid : { in: [] };
    } else {
      where.simId = { in: ids };
    }
  }

  if (status === "success" || status === "failed") where.status = status;

  const from = params.get("from");
  const to = params.get("to");
  const range: { gte?: Date; lt?: Date } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    range.gte = new Date(from + "T00:00:00Z");
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    range.lt = new Date(to + "T00:00:00Z");
    range.lt.setUTCDate(range.lt.getUTCDate() + 1);
  }
  if (range.gte || range.lt) where.sentAt = range;

  return where;
}

export default async function RemindersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { simId, q, status, from, to, page } = await searchParams;

  // 分页:page 默认 1,parseInt 失败也 fallback 到 1
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const where = await buildWhere(
    new URLSearchParams(
      Object.entries({ simId, q, status, from, to })
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    )
  );

  // 列表 + 概览并行(无 filter,全量)
  const now = new Date();
  const sp = shanghaiParts(now);
  const todayStartUTC = new Date(Date.UTC(sp.year, sp.month - 1, sp.day));

  const [reminders, totalCount, totalToday, failedToday] = await Promise.all([
    prisma.reminderSent.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { sim: true, user: true },
    }),
    prisma.reminderSent.count({ where }),
    prisma.reminderSent.count({ where: { sentAt: { gte: todayStartUTC } } }),
    prisma.reminderSent.count({
      where: { status: "failed", sentAt: { gte: todayStartUTC } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const exportQS = new URLSearchParams();
  if (simId) exportQS.set("simId", simId);
  if (q) exportQS.set("q", q);
  if (status) exportQS.set("status", status);
  if (from) exportQS.set("from", from);
  if (to) exportQS.set("to", to);
  const exportUrl = `/api/admin/reminders/export${
    exportQS.toString() ? "?" + exportQS.toString() : ""
  }`;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">提醒日志</h1>
        <a
          href={exportUrl}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          ⬇ 导出 CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <AdminStat label="今日发送" value={totalToday} tone="indigo" />
        <AdminStat
          label="今日失败"
          value={failedToday}
          tone={failedToday > 0 ? "rose" : "slate"}
          sub={failedToday > 0 ? "需排查" : "全部成功"}
        />
      </div>

      <SearchForm
        simId={simId}
        q={q}
        status={status}
        from={from}
        to={to}
      />

      {reminders.length === 0 && q ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          没有找到匹配 &quot;{q}&quot; 的号码
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 hidden md:table-cell">ID</th>
                  <th className="text-left px-3 py-2">时间 (UTC)</th>
                  <th className="text-left px-3 py-2">号码</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">day/bucket</th>
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
                      <td className="px-3 py-2 font-mono text-xs text-slate-500 hidden md:table-cell">
                        {r.id}
                      </td>
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
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap hidden md:table-cell">
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
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        basePath="/admin/reminders"
        searchParams={
          new URLSearchParams(
            Object.entries({ simId, q, status, from, to })
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, String(v)])
          )
        }
      />
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

import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import { CsvImportButton } from "./csv-import-button";
import { EmptyState } from "@/app/_components/empty-state";
import { AdminStat } from "../_components/admin-stat";
import { Pagination } from "../_components/pagination";
import { AutoSubmitForm } from "../_components/auto-submit-form";
import { SimsBulkTable } from "./_components/sims-bulk-table";
import type { Prisma } from "@/lib/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    bound?: string;
    page?: string;
    /** Round 194: 日期范围 (yyyy-MM-dd) */
    from?: string;
    to?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function SimsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { q, status, bound, page, from, to } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const where: Prisma.SimWhereInput = {};
  if (q) {
    const cleaned = q.replace(/\D/g, "");
    where.phoneNumber = { contains: cleaned || q };
  }
  if (status === "active" || status === "paused") {
    where.status = status;
  }
  if (bound === "yes") {
    where.user = { isNot: null };
  } else if (bound === "no") {
    where.user = null;
  }

  // Round 194: 日期范围 (createdAt) 过滤
  if (from || to) {
    const createdAtRange: { gte?: Date; lt?: Date } = {};
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      createdAtRange.gte = new Date(from + "T00:00:00Z");
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const lt = new Date(to + "T00:00:00Z");
      lt.setUTCDate(lt.getUTCDate() + 1);
      createdAtRange.lt = lt;
    }
    if (createdAtRange.gte || createdAtRange.lt) {
      where.createdAt = createdAtRange;
    }
  }

  // 列表 + 概览计数并行(无 filter,全量)
  const [sims, totalSims, activeSims, pausedSims, totalCount] = await Promise.all([
    prisma.sim.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: PAGE_SIZE,
      // N6: 拉取最近一次发送的时间+状态,join 在单次 SQL 里完成,避免 N+1
      select: {
        id: true,
        phoneNumber: true,
        activatedAt: true,
        lastPortedAt: true,
        status: true,
        channel: true,
        reminders: {
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { sentAt: true, status: true },
        },
      },
    }),
    prisma.sim.count(),
    prisma.sim.count({ where: { status: "active" } }),
    prisma.sim.count({ where: { status: "paused" } }),
    prisma.sim.count({ where }), // 用于分页
  ]);

  // 把 server 数据序列化给 client 组件(传给 <SimsBulkTable>)
  const rows = sims.map((sim) => {
    const baseline = sim.lastPortedAt ?? sim.activatedAt;
    const dayOffset = dayOffsetFromBaseline(baseline);
    const last = sim.reminders[0];
    return {
      id: sim.id,
      phoneNumber: sim.phoneNumber,
      activatedAt: sim.activatedAt.toISOString().slice(0, 10),
      lastPortedAt: sim.lastPortedAt?.toISOString().slice(0, 10) ?? null,
      status: sim.status,
      dayOffset,
      inWindow: isInReminderWindow(dayOffset),
      channel: sim.channel,
      lastSentAt: last
        ? last.sentAt.toISOString().replace("T", " ").slice(0, 19)
        : null,
      lastSentStatus: last?.status ?? null,
    };
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-4">号码管理</h1>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <AdminStat label="号码总数" value={totalSims} />
        <AdminStat
          label="active"
          value={activeSims}
          sub={totalSims > 0 ? `占比 ${Math.round((activeSims / totalSims) * 100)}%` : "—"}
          tone="emerald"
        />
        <AdminStat
          label="paused"
          value={pausedSims}
          sub={totalSims > 0 ? `占比 ${Math.round((pausedSims / totalSims) * 100)}%` : "—"}
          tone="slate"
        />
      </div>
      <div className="flex items-center justify-end mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          <Link
            href="/admin/sims/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            + 新增
          </Link>
          <CsvImportButton />
          <a
            href={`/api/admin/sims/export${buildExportQS(q, status, bound)}`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            ⬇ 导出 CSV
          </a>
        </div>
      </div>

      <AutoSubmitForm className="mb-4 flex gap-2 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索手机号（支持后 6 位）"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm flex-1 min-w-[200px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <select
          name="status"
          defaultValue={status || ""}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        >
          <option value="">全部状态</option>
          <option value="active">active</option>
          <option value="paused">paused</option>
        </select>
        <select
          name="bound"
          defaultValue={bound || ""}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        >
          <option value="">全部绑定</option>
          <option value="yes">已绑</option>
          <option value="no">未绑</option>
        </select>
        {/* Round 194: 日期范围过滤 (跟 /admin/reminders 一致) */}
        <input
          name="from"
          defaultValue={from || ""}
          placeholder="起始日期"
          type="date"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        />
        <span className="text-slate-400">→</span>
        <input
          name="to"
          defaultValue={to || ""}
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
      </AutoSubmitForm>

      {/* Round 196: 当前过滤状态提示 (date 范围 + status + bound + search) */}
      {(from || to || status || bound || q) && (
        <div className="mb-3 text-sm text-slate-600 flex items-center gap-2 flex-wrap">
          <span>当前过滤:</span>
          {q && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              搜索 &quot;{q}&quot;
            </span>
          )}
          {status && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {status}
            </span>
          )}
          {bound && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {bound === "yes" ? "已绑" : "未绑"}
            </span>
          )}
          {(from || to) && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {from || "..."} → {to || "..."}
            </span>
          )}
          <Link
            href="/admin/sims"
            className="text-indigo-600 hover:underline text-xs"
          >
            清除全部
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title="暂无号码"
            hint="录入第一个号码让系统开始提醒"
            actions={[
              { href: "/admin/sims/new", label: "+ 新增号码", primary: true },
            ]}
          />
        ) : (
          <div className="overflow-x-auto">
            <SimsBulkTable sims={rows} />
          </div>
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          basePath="/admin/sims"
          searchParams={
            new URLSearchParams(
              Object.entries({ q, status, bound })
                .filter(([, v]) => v != null)
                .map(([k, v]) => [k, String(v)])
            )
          }
        />
      </div>
    </div>
  );
}

/**
 * 复用当前页面的筛选条件构造 export query string
 */
function buildExportQS(
  q: string | undefined,
  status: string | undefined,
  bound: string | undefined
): string {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  if (bound) sp.set("bound", bound);
  const s = sp.toString();
  return s ? "?" + s : "";
}

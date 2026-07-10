import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import { CsvImportButton } from "./csv-import-button";
import { EmptyState } from "@/app/_components/empty-state";
import { SimsBulkTable } from "./_components/sims-bulk-table";
import type { Prisma } from "@/lib/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function SimsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { q, status } = await searchParams;

  const where: Prisma.SimWhereInput = {};
  if (q) {
    const cleaned = q.replace(/\D/g, "");
    where.phoneNumber = { contains: cleaned || q };
  }
  if (status === "active" || status === "paused") {
    where.status = status;
  }

  const sims = await prisma.sim.findMany({
    where,
    orderBy: { id: "desc" },
    take: 200,
    // N6: 拉取最近一次发送的时间+状态,join 在单次 SQL 里完成,避免 N+1
    include: {
      user: true,
      reminders: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true, status: true },
      },
    },
  });

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
      channel: sim.user?.channel ?? "",
      lastSentAt: last
        ? last.sentAt.toISOString().replace("T", " ").slice(0, 19)
        : null,
      lastSentStatus: last?.status ?? null,
    };
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">号码管理</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/sims/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            + 新增
          </Link>
          <CsvImportButton />
          <a
            href={`/api/admin/sims/export${buildExportQS(q, status)}`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            ⬇ 导出 CSV
          </a>
        </div>
      </div>

      <form className="mb-4 flex gap-2 flex-wrap">
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
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          搜索
        </button>
      </form>

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
        {sims.length === 200 && (
          <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100 bg-slate-50">
            仅显示最近 200 条,请用搜索缩小范围
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 复用当前页面的筛选条件构造 export query string
 */
function buildExportQS(q: string | undefined, status: string | undefined): string {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  const s = sp.toString();
  return s ? "?" + s : "";
}

import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import { CsvImportButton } from "./csv-import-button";
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
    include: { user: true },
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">手机号</th>
                <th className="text-left px-3 py-2">激活日期</th>
                <th className="text-left px-3 py-2">上次保号</th>
                <th className="text-left px-3 py-2">天数</th>
                <th className="text-left px-3 py-2">状态</th>
                <th className="text-left px-3 py-2">绑定</th>
                <th className="text-left px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {sims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                sims.map((sim) => {
                  const baseline = sim.lastPortedAt ?? sim.activatedAt;
                  const dayOffset = dayOffsetFromBaseline(baseline);
                  const inWindow = isInReminderWindow(dayOffset);
                  return (
                    <tr key={sim.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{sim.id}</td>
                      <td className="px-3 py-2 font-mono">{sim.phoneNumber}</td>
                      <td className="px-3 py-2">{sim.activatedAt.toISOString().slice(0, 10)}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {sim.lastPortedAt?.toISOString().slice(0, 10) || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            inWindow ? "text-amber-700 font-semibold" : "text-slate-700"
                          }
                        >
                          {dayOffset}d
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            sim.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {sim.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {sim.user ? (
                          <span className="text-slate-700">{sim.user.channel}</span>
                        ) : (
                          <span className="text-slate-400">未绑定</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/sims/${sim.id}`}
                          className="text-indigo-600 hover:underline text-sm"
                        >
                          编辑
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {sims.length === 200 && (
          <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100 bg-slate-50">
            仅显示最近 200 条,请用搜索缩小范围
          </div>
        )}
      </div>
    </div>
  );
}

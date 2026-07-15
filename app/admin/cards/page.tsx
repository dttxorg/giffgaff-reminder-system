import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { formatCardCode } from "@/lib/card-key";
import { AdminStat } from "../_components/admin-stat";
import type { Prisma } from "@/lib/generated/prisma/client";
import { CardDeleteButton } from "./delete-button";
import { CopyCodeButton } from "./_components/copy-code-button";
import { EmptyState } from "@/app/_components/empty-state";
import { Pagination } from "../_components/pagination";
import { AutoSubmitForm } from "../_components/auto-submit-form";

interface PageProps {
  searchParams: Promise<{ used?: string; q?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function CardsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { used, q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const where: Prisma.CardKeyWhereInput = {};
  if (used === "true") where.used = true;
  if (used === "false") where.used = false;
  if (q) {
    const trimmed = q.trim();
    const raw = trimmed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (raw.length === 16) {
      where.code = raw;
    } else {
      where.notes = { contains: trimmed, mode: "insensitive" };
    }
  }
  const hasFilters = Object.keys(where).length > 0;

  // 列表 + 一次兑换状态聚合；无筛选时分页总数直接复用聚合结果。
  const [cards, usageCounts, filteredCountResult] = await Promise.all([
    prisma.cardKey.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        used: true,
        notes: true,
        createdAt: true,
        usedAt: true,
      },
    }),
    prisma.cardKey.groupBy({
      by: ["used"],
      _count: { _all: true },
    }),
    hasFilters
      ? prisma.cardKey.count({ where })
      : Promise.resolve<number | null>(null),
  ]);
  const usedCount =
    usageCounts.find((group) => group.used)?._count._all ?? 0;
  const unusedCount =
    usageCounts.find((group) => !group.used)?._count._all ?? 0;
  const totalCount = usedCount + unusedCount;
  const filteredCount = filteredCountResult ?? totalCount;

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  const exportUrl = (() => {
    const sp = new URLSearchParams();
    if (used) sp.set("used", used);
    return `/api/admin/cards/export${sp.toString() ? "?" + sp.toString() : ""}`;
  })();

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">卡密管理</h1>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <AdminStat label="卡密总数" value={totalCount} />
        <AdminStat
          label="未兑换"
          value={unusedCount}
          sub={totalCount > 0 ? `占比 ${Math.round((unusedCount / totalCount) * 100)}%` : "—"}
          tone="amber"
        />
        <AdminStat
          label="已兑换"
          value={usedCount}
          sub={totalCount > 0 ? `占比 ${Math.round((usedCount / totalCount) * 100)}%` : "—"}
          tone="indigo"
        />
      </div>
      <div className="flex items-center justify-end mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          <a
            href={exportUrl}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            导出 CSV
          </a>
          <Link
            href="/admin/cards/import"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            title="把已有的卡密列表批量导入(适合分销商给的批次)"
          >
            ⬆ 批量导入
          </Link>
          <Link
            href="/admin/cards/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            + 生成卡密
          </Link>
        </div>
      </div>

      <AutoSubmitForm className="mb-4 flex gap-2 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索卡密 / 备注"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm flex-1 min-w-[200px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <select
          name="used"
          defaultValue={used || ""}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        >
          <option value="">全部状态</option>
          <option value="false">未兑换</option>
          <option value="true">已兑换</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          搜索
        </button>
      </AutoSubmitForm>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">卡密</th>
                <th className="text-left px-3 py-2">状态</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">备注</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">创建时间</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">兑换时间</th>
                <th className="text-left px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="暂无可用卡密"
                      hint="生成一批卡密给客户兑换,绑定 sim 后自动开提醒"
                      actions={[
                        { href: "/admin/cards/new", label: "+ 生成卡密", primary: true },
                      ]}
                    />
                  </td>
                </tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {c.id}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-indigo-700 tracking-wider">
                          {formatCardCode(c.code)}
                        </span>
                        <CopyCodeButton code={formatCardCode(c.code)} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {c.used ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">
                          已兑换
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">
                          未兑换
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700 max-w-xs hidden md:table-cell">
                      {c.notes ? (
                        <span className="block whitespace-pre-wrap break-words leading-relaxed">
                          {c.notes}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 hidden md:table-cell">
                      {c.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {c.usedAt?.toISOString().slice(0, 10) || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {!c.used && <CardDeleteButton id={c.id} />}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={filteredCount}
          basePath="/admin/cards"
          searchParams={
            new URLSearchParams(
              Object.entries({ used, q })
                .filter(([, v]) => v != null)
                .map(([k, v]) => [k, String(v)])
            )
          }
        />
      </div>
    </div>
  );
}

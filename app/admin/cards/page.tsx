import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { formatCardCode } from "@/lib/card-key";
import type { Prisma } from "@/lib/generated/prisma/client";
import { CardDeleteButton } from "./delete-button";

interface PageProps {
  searchParams: Promise<{ used?: string; q?: string }>;
}

export default async function CardsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { used, q } = await searchParams;

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

  const cards = await prisma.cardKey.findMany({
    where,
    orderBy: { id: "desc" },
    take: 200,
  });

  // 顶部统计
  const unusedCount = await prisma.cardKey.count({ where: { used: false } });

  const exportUrl = (() => {
    const sp = new URLSearchParams();
    if (used) sp.set("used", used);
    return `/api/admin/cards/export${sp.toString() ? "?" + sp.toString() : ""}`;
  })();

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">卡密管理</h1>
          <div className="text-xs text-slate-500 mt-1">
            未兑换卡密共 {unusedCount} 张
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={exportUrl}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            导出 CSV
          </a>
          <Link
            href="/admin/cards/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            + 生成卡密
          </Link>
        </div>
      </div>

      <form className="mb-4 flex gap-2 flex-wrap">
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
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">卡密</th>
                <th className="text-left px-3 py-2">状态</th>
                <th className="text-left px-3 py-2">备注</th>
                <th className="text-left px-3 py-2">创建时间</th>
                <th className="text-left px-3 py-2">兑换时间</th>
                <th className="text-left px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    暂无卡密
                  </td>
                </tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {c.id}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-indigo-700 tracking-wider">
                      {formatCardCode(c.code)}
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
                    <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate">
                      {c.notes || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
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
        {cards.length === 200 && (
          <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100 bg-slate-50">
            仅显示最近 200 条,请用搜索缩小范围
          </div>
        )}
      </div>
    </div>
  );
}
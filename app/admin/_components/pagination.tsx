import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  /** 列表页基础路径(不含 query),如 "/admin/reminders" */
  basePath: string;
  /** 当前列表页的 searchParams(只覆盖 page,其他保留) */
  searchParams: URLSearchParams;
}

/**
 * admin 列表分页控件
 *
 * 行为:
 * - 总数 <= 0: 不显示
 * - 总数 <= PAGE_SIZE: 只显示"共 N 条"一行
 * - 总数 > PAGE_SIZE: 显示"共 N 条 · 第 M/K 页" + 上一页/下一页
 * - 按钮在到头时禁用(灰边框,不可点)
 *
 * URL 处理:makeUrl 保留所有现有 searchParams,只覆盖 page
 * - page=1 时删除 page 参数(保持 URL 干净)
 */
export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  basePath,
  searchParams,
}: PaginationProps) {
  if (totalCount <= 0) return null;
  if (totalPages <= 1) {
    return (
      <p className="text-xs text-slate-500 mt-3 text-center">
        共 {totalCount} 条
      </p>
    );
  }
  const makeUrl = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const s = next.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      className="flex items-center justify-between mt-3 px-2"
      aria-label="分页"
    >
      <p className="text-xs text-slate-500">
        共 {totalCount} 条 · 第 {currentPage} / {totalPages} 页
      </p>
      <div className="flex gap-1">
        {hasPrev ? (
          <Link
            href={makeUrl(currentPage - 1)}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            上一页
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-300 bg-slate-50">
            上一页
          </span>
        )}
        {hasNext ? (
          <Link
            href={makeUrl(currentPage + 1)}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            下一页
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-300 bg-slate-50">
            下一页
          </span>
        )}
      </div>
    </nav>
  );
}

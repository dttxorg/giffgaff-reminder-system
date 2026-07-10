import Link from "next/link";

/**
 * 4 渠道顺序(固定)— prev/next 导航用
 */
export const HELP_ORDER = [
  { slug: "serverchan", label: "Sever酱" },
  { slug: "bark", label: "Bark" },
  { slug: "pushplus", label: "pushplus" },
  { slug: "telegram", label: "Telegram" },
] as const;

/**
 * 教程页底部"上一节 / 下一节"导航
 *
 * 设计:
 * - 桌面:左右分布(左 prev / 右 next)
 * - 移动:上下堆叠
 * - 循环:最后一节 next 回到第一节
 */
export function HelpPagination({ current }: { current: string }) {
  const idx = HELP_ORDER.findIndex((h) => h.slug === current);
  const prev = HELP_ORDER[(idx - 1 + HELP_ORDER.length) % HELP_ORDER.length];
  const next = HELP_ORDER[(idx + 1) % HELP_ORDER.length];

  return (
    <nav
      aria-label="教程导航"
      className="not-prose mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between gap-3"
    >
      <Link
        href={`/help/${prev.slug}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>上一节:{prev.label}</span>
      </Link>
      <Link
        href={`/help/${next.slug}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors sm:order-last"
      >
        <span>下一节:{next.label}</span>
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </nav>
  );
}

import Link from "next/link";

interface AdminStatProps {
  label: string;
  value: number | string | undefined;
  sub?: string;
  tone?: "indigo" | "amber" | "emerald" | "rose" | "slate";
  subTone?: "indigo" | "amber" | "rose" | "slate";
  /** Round 197: 点击跳转 (传了变 Link) */
  href?: string;
}

/**
 * admin 页面 stat 卡片(从 app/admin/page.tsx 抽出来复用)
 * 圆角 + 边框 + 大数字 + 副标 + 可选着色
 * Round 197: 传 href 变 Link (整张卡可点跳转)
 */
export function AdminStat({
  label,
  value,
  sub,
  tone,
  subTone = "slate",
  href,
}: AdminStatProps) {
  const toneClass =
    tone === "indigo"
      ? "text-indigo-600"
      : tone === "amber"
      ? "text-amber-600"
      : tone === "emerald"
      ? "text-emerald-600"
      : tone === "rose"
      ? "text-rose-600"
      : "text-slate-900";
  const subClass =
    subTone === "indigo"
      ? "text-indigo-600"
      : subTone === "amber"
      ? "text-amber-600"
      : subTone === "rose"
      ? "text-rose-600"
      : "text-slate-500";
  const containerClass = href
    ? "block min-h-28 rounded-xl border border-slate-200 bg-white p-4 transition-[background-color,border-color,transform] hover:border-indigo-300 hover:bg-slate-50 active:translate-y-px"
    : "min-h-28 rounded-xl border border-slate-200 bg-white p-4";
  const inner = (
    <>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>
        {value === undefined ? "—" : value}
      </div>
      {sub && <div className={`text-xs mt-1 ${subClass}`}>{sub}</div>}
    </>
  );
  return href ? (
    <Link href={href} className={containerClass}>
      {inner}
    </Link>
  ) : (
    <div className={containerClass}>{inner}</div>
  );
}

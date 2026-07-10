interface AdminStatProps {
  label: string;
  value: number | string | undefined;
  sub?: string;
  tone?: "indigo" | "amber" | "emerald" | "rose" | "slate";
  subTone?: "indigo" | "amber" | "rose" | "slate";
}

/**
 * admin 页面 stat 卡片(从 app/admin/page.tsx 抽出来复用)
 * 圆角 + 边框 + 大数字 + 副标 + 可选着色
 */
export function AdminStat({
  label,
  value,
  sub,
  tone,
  subTone = "slate",
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
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${toneClass}`}>
        {value === undefined ? "—" : value}
      </div>
      {sub && <div className={`text-xs mt-1 ${subClass}`}>{sub}</div>}
    </div>
  );
}

import Link from "next/link";

export interface PushSummaryCardProps {
  /** 显示中的总条数(受 simId/status/from/to 筛选影响) */
  totalShown: number;
  /** 显示中的成功条数 */
  successCount: number;
  /** 显示中的失败条数 */
  failedCount: number;
  /** 当前过滤的 sim id(可空) */
  activeSimId?: number | null;
}

/**
 * Round 220: /me/pushes 顶部推送统计概览
 *
 * 设计:4 个 stat 块(总/成功/失败/送达率),每个带 icon + 大数字 + 标签
 * - 成功用 emerald,失败用 rose,总用 slate
 * - 送达率 = success / (success + failed),无数据时显示 "—"
 * - 每个 block 可点(跳到对应筛选的 /me/pushes URL),但只在当前 filter 未选时高亮可点
 */
export function PushSummaryCard({
  totalShown,
  successCount,
  failedCount,
  activeSimId,
}: PushSummaryCardProps) {
  const denom = successCount + failedCount;
  const successRate = denom > 0 ? Math.round((successCount / denom) * 100) : null;
  // 5 个 stat:总数 / 成功 / 失败 / 送达率
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
      <StatBlock
        icon="list"
        label="共推送"
        value={String(totalShown)}
        tone="slate"
        href={null}
      />
      <StatBlock
        icon="check"
        label="成功"
        value={String(successCount)}
        tone="emerald"
        href={
          activeSimId
            ? `/me/pushes?simId=${activeSimId}&status=success`
            : "/me/pushes?status=success"
        }
      />
      <StatBlock
        icon="x"
        label="失败"
        value={String(failedCount)}
        tone={failedCount > 0 ? "rose" : "slate"}
        href={
          activeSimId
            ? `/me/pushes?simId=${activeSimId}&status=failed`
            : "/me/pushes?status=failed"
        }
      />
      <StatBlock
        icon="percent"
        label="送达率"
        value={successRate === null ? "—" : `${successRate}%`}
        tone={successRate === null ? "slate" : successRate >= 95 ? "emerald" : successRate >= 80 ? "amber" : "rose"}
        href={null}
      />
    </div>
  );
}

type Tone = "slate" | "emerald" | "amber" | "rose";

const TONE_STYLES: Record<Tone, { bg: string; text: string; iconBg: string }> = {
  slate: { bg: "bg-slate-50", text: "text-slate-700", iconBg: "bg-slate-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", iconBg: "bg-emerald-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", iconBg: "bg-amber-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", iconBg: "bg-rose-200" },
};

function StatBlock({
  icon,
  label,
  value,
  tone,
  href,
}: {
  icon: "list" | "check" | "x" | "percent";
  label: string;
  value: string;
  tone: Tone;
  href: string | null;
}) {
  const styles = TONE_STYLES[tone];
  const inner = (
    <div className={`rounded-xl p-3 ${styles.bg} ${href ? "hover:ring-2 hover:ring-indigo-200 transition-shadow cursor-pointer" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-5 h-5 rounded ${styles.iconBg} flex items-center justify-center`}>
          <StatIcon icon={icon} tone={tone} />
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          {label}
        </span>
      </div>
      <div className={`text-xl font-bold ${styles.text}`}>{value}</div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block" aria-label={`只看${label}`}>
        {inner}
      </Link>
    );
  }
  return inner;
}

function StatIcon({ icon, tone }: { icon: "list" | "check" | "x" | "percent"; tone: Tone }) {
  const colorMap: Record<Tone, string> = {
    slate: "text-slate-600",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  };
  const c = colorMap[tone];
  if (icon === "list") {
    return (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={c}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    );
  }
  if (icon === "check") {
    return (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={c}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (icon === "x") {
    return (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={c}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  // percent
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={c}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

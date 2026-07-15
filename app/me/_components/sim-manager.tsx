"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  filterAndSortSimManagerItems,
  formatSimTiming,
  getSimAttention,
  getSimManagerCounts,
  type SimAttention,
  type SimManagerFilter,
  type SimManagerSort,
} from "@/lib/sim-manager";

export interface SimManagerItem {
  id: number;
  phoneNumber: string;
  status: "active" | "paused";
  missingChannel: boolean;
  dayOffset: number;
  createdAt: string;
  channel: "serverchan" | "bark" | "pushplus" | "telegram";
  isPrimary: boolean;
}

interface SimManagerProps {
  sims: SimManagerItem[];
  activeSimId: number;
}

const CHANNEL_LABEL: Record<SimManagerItem["channel"], string> = {
  serverchan: "Sever酱",
  bark: "Bark",
  pushplus: "pushplus",
  telegram: "Telegram",
};

const ATTENTION_STYLE: Record<
  SimAttention,
  { label: string; dot: string; text: string; selectedBg: string }
> = {
  overdue: {
    label: "已超期",
    dot: "bg-rose-500",
    text: "text-rose-700",
    selectedBg: "bg-rose-50/70",
  },
  window: {
    label: "提醒窗口",
    dot: "bg-amber-500",
    text: "text-amber-700",
    selectedBg: "bg-amber-50/70",
  },
  missing: {
    label: "未配置",
    dot: "bg-orange-400",
    text: "text-orange-700",
    selectedBg: "bg-orange-50/70",
  },
  normal: {
    label: "监控正常",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    selectedBg: "bg-indigo-50/70",
  },
  paused: {
    label: "已暂停",
    dot: "bg-slate-400",
    text: "text-slate-500",
    selectedBg: "bg-slate-100",
  },
};

const FILTER_LABEL: Array<{ key: SimManagerFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "attention", label: "需处理" },
  { key: "window", label: "窗口内" },
  { key: "missing", label: "未配置" },
  { key: "paused", label: "暂停" },
];

/**
 * 多号码管理器：桌面端作为固定主列表，移动端折叠为“当前号码 + 切换”面板。
 * 列表只负责发现与切换；号码详情仍由 /me 的服务端组件渲染。
 */
export function SimManager({ sims, activeSimId }: SimManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SimManagerFilter>("all");
  const [sort, setSort] = useState<SimManagerSort>("priority");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingSimId, setPendingSimId] = useState<number | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedSimIdsRef = useRef(new Set<number>());

  const counts = useMemo(() => getSimManagerCounts(sims), [sims]);
  const visibleSims = useMemo(
    () => filterAndSortSimManagerItems(sims, query, filter, sort),
    [sims, query, filter, sort]
  );
  const activeSim = sims.find((sim) => sim.id === activeSimId) ?? sims[0] ?? null;
  // 服务端返回目标号码后，activeSimId 与 pendingSimId 相同，等待态自然结束。
  const isSwitchingSim = pendingSimId !== null && pendingSimId !== activeSimId;

  useEffect(
    () => () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    },
    []
  );

  const cancelQueuedPrefetch = () => {
    if (!prefetchTimerRef.current) return;
    clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  };

  const prefetchSim = (simId: number) => {
    cancelQueuedPrefetch();
    if (simId === activeSimId || prefetchedSimIdsRef.current.has(simId)) return;
    router.prefetch(`/me?simId=${simId}`);
    prefetchedSimIdsRef.current.add(simId);
  };

  const queueSimPrefetch = (simId: number) => {
    cancelQueuedPrefetch();
    if (simId === activeSimId || prefetchedSimIdsRef.current.has(simId)) return;

    // 鼠标只是掠过列表时不立即发请求，停留片刻才预取目标号码。
    prefetchTimerRef.current = setTimeout(() => {
      router.prefetch(`/me?simId=${simId}`);
      prefetchedSimIdsRef.current.add(simId);
      prefetchTimerRef.current = null;
    }, 100);
  };

  const filterCount = (key: SimManagerFilter): number => {
    if (key === "all") return counts.all;
    if (key === "attention") return counts.attention;
    if (key === "window") return counts.window;
    if (key === "missing") return counts.missing;
    return counts.paused;
  };

  return (
    <section
      aria-labelledby="sim-manager-title"
      className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-20 lg:mb-0"
    >
      <div className="border-b border-slate-200 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="sim-manager-title" className="font-semibold text-slate-900">
              号码管理
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              共 {counts.all} 张
              {counts.attention > 0 && (
                <span className="ml-2 font-medium text-rose-700">· {counts.attention} 张需处理</span>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="sim-manager-panel"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
          >
            {mobileOpen ? "收起" : "切换号码"}
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
              className={`transition-transform ${mobileOpen ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {activeSim && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 lg:hidden">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-slate-900">
                {formatPhoneForDisplay(activeSim.phoneNumber)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">当前查看</p>
            </div>
            <SimAttentionLabel sim={activeSim} />
          </div>
        )}
      </div>

      <div id="sim-manager-panel" className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
        <div className="space-y-3 border-b border-slate-200 p-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索完整号码或尾号"
              aria-label="搜索 SIM 卡"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-10 text-base outline-none transition sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清除搜索"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <svg
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div aria-label="按号码状态筛选">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-3">
              {FILTER_LABEL.map((item) => {
                const selected = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(item.key)}
                    className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                    <span className={selected ? "text-slate-300" : "text-slate-400"}>
                      {filterCount(item.key)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500" aria-live="polite">
              显示 {visibleSims.length} / {sims.length} 张
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              排序
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SimManagerSort)}
                aria-label="号码排序"
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="priority">紧急优先</option>
                <option value="number">按号码</option>
                <option value="recent">最近添加</option>
              </select>
            </label>
          </div>
        </div>

        <nav aria-label="受监控的手机号码" aria-busy={isSwitchingSim}>
          {isSwitchingSim && (
            <span className="sr-only" role="status" aria-live="polite">
              正在切换号码
            </span>
          )}
          {visibleSims.length > 0 ? (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto overscroll-contain lg:max-h-[calc(100vh-18rem)]">
              {visibleSims.map((sim) => {
                const isActive = sim.id === activeSimId;
                const isPending = isSwitchingSim && sim.id === pendingSimId;
                const attention = getSimAttention(sim);
                const style = ATTENTION_STYLE[attention];
                return (
                  <li key={sim.id}>
                    <Link
                      href={`/me?simId=${sim.id}`}
                      prefetch={false}
                      scroll={false}
                      aria-current={isActive ? "page" : undefined}
                      aria-busy={isPending || undefined}
                      onMouseEnter={() => queueSimPrefetch(sim.id)}
                      onMouseLeave={cancelQueuedPrefetch}
                      onFocus={() => prefetchSim(sim.id)}
                      onTouchStart={() => prefetchSim(sim.id)}
                      onClick={(event) => {
                        setMobileOpen(false);
                        if (
                          isActive ||
                          event.button !== 0 ||
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey
                        ) {
                          return;
                        }
                        setPendingSimId(sim.id);
                      }}
                      className={`block min-h-[76px] px-4 py-3 transition-colors hover:bg-slate-50 ${
                        isPending
                          ? "bg-indigo-50/90 shadow-[inset_3px_0_0_#4f46e5]"
                          : isActive
                            ? `${style.selectedBg} shadow-[inset_3px_0_0_#4f46e5]`
                            : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-mono text-sm font-semibold text-slate-900">
                              {formatPhoneForDisplay(sim.phoneNumber)}
                            </span>
                            {sim.isPrimary && (
                              <span className="shrink-0 text-[10px] font-medium text-indigo-600">主卡</span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {sim.dayOffset < 0 ? "尚未激活" : `第 ${sim.dayOffset} 天`} · {sim.missingChannel ? "未设置渠道" : CHANNEL_LABEL[sim.channel]}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {isPending ? (
                            <div className="flex min-h-9 items-center gap-1.5 text-xs font-medium text-indigo-700">
                              <svg
                                width={14}
                                height={14}
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                                className="animate-spin"
                              >
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                              </svg>
                              正在加载
                            </div>
                          ) : (
                            <>
                              <div className={`flex items-center justify-end gap-1.5 text-xs font-medium ${style.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                                {style.label}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">{formatSimTiming(sim)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">没有符合条件的号码</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="mt-2 min-h-11 px-3 text-sm font-medium text-indigo-600 hover:underline"
              >
                清除筛选
              </button>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <Link
            href="/redeem"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 px-3 text-sm font-medium text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50"
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            绑定更多 SIM 卡
          </Link>
        </div>
      </div>
    </section>
  );
}

function SimAttentionLabel({ sim }: { sim: SimManagerItem }) {
  const attention = getSimAttention(sim);
  const style = ATTENTION_STYLE[attention];
  return (
    <div className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {style.label}
    </div>
  );
}

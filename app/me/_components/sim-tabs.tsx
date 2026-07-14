"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { filterSimsByQuery } from "@/lib/sim-search";

export interface SimTabItem {
  id: number;
  phoneNumber: string;
  phoneTail4: string;
  status: "active" | "paused";
  /** 渠道未配置时,tab 上打个小红点提示 */
  missingChannel: boolean;
}

interface SimTabsProps {
  sims: SimTabItem[];
  activeSimId: number;
}

/**
 * 多卡切换 tabs(客户端组件,有搜索框)
 *
 * 设计要点:
 *  - 搜索框:仅 2+ 卡时显示(单卡不显示 tabs 也不需要搜索)
 *  - 搜索过滤(纯函数 lib/sim-search):支持后 N 位 / 全号 / 子串 / 忽略空格横线
 *  - 切换卡用 ?simId=X URL 参数(URL 是 state,刷新/分享保持选中)
 *  - "+ 添加" tab 跳 /redeem(已登录自动绑定到当前账号)
 *  - 移动端:tab 水平滚动 + 右端渐变提示溢出
 */
export function SimTabs({ sims, activeSimId }: SimTabsProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterSimsByQuery(sims, query),
    [sims, query]
  );

  const hasResults = filtered.length > 0;
  const showSearch = sims.length >= 2;

  return (
    <div className="mb-4 -mx-4 sm:mx-0">
      {/* 搜索框:仅多卡时显示 */}
      {showSearch && (
        <div className="relative px-4 sm:px-0 mb-2">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜手机号(后 4 位/全号/带空格都行)"
              aria-label="搜索 SIM 卡"
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清除搜索"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          {/* 搜索结果计数 */}
          {query && (
            <p className="text-[11px] text-slate-500 mt-1 px-0.5">
              {hasResults
                ? `${filtered.length} / ${sims.length} 张卡匹配`
                : `没有匹配的卡`}
            </p>
          )}
        </div>
      )}

      {/* tabs 滚动容器 */}
      <div className="relative">
        <div
          className="overflow-x-auto px-4 sm:px-0 scrollbar-thin"
          // tabs 始终在视口顶部方便切换
        >
          <div
            role="tablist"
            aria-label="SIM 卡切换"
            className="inline-flex gap-1.5 p-1 bg-slate-100 rounded-lg min-w-full sm:min-w-0"
          >
            {filtered.map((sim) => {
              const isActive = sim.id === activeSimId;
              // 计算 sim 在原始列表(未过滤)里的位置
              const originalIdx = sims.findIndex((s) => s.id === sim.id);
              const isPrimary = originalIdx === 0;
              return (
                <Link
                  key={sim.id}
                  href={`/me?simId=${sim.id}`}
                  role="tab"
                  aria-selected={isActive}
                  scroll={false}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                  title={
                    sim.missingChannel
                      ? "该 SIM 卡还没设置通知渠道,点此查看"
                      : sim.status === "paused"
                        ? "该 SIM 卡已暂停"
                        : undefined
                  }
                >
                  <span className="font-mono">**** {sim.phoneNumber.slice(-4)}</span>
                  {isPrimary && (
                    <span
                      className={`text-[10px] px-1 rounded ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      主
                    </span>
                  )}
                  {sim.missingChannel && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-rose-500"
                      aria-label="未设置通知渠道"
                    />
                  )}
                  {sim.status === "paused" && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-slate-400"
                      aria-label="已暂停"
                    />
                  )}
                </Link>
              );
            })}
            {/* "+ 添加" tab,跳到 /redeem(已登录自动绑定到当前账号) */}
            <Link
              href="/redeem"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-indigo-600 hover:bg-white/50 transition-colors"
              title="用新卡密绑定第 N+1 张 SIM 卡"
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加
            </Link>
          </div>
        </div>
        {/* 右端渐变提示溢出(仅移动端) */}
        <div
          className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>

      {/* 无匹配结果的提示 */}
      {query && !hasResults && (
        <div className="mt-3 p-3 rounded-md bg-slate-50 border border-slate-200 text-center">
          <p className="text-sm text-slate-600">
            没找到匹配 <span className="font-mono font-medium text-slate-900">&quot;{query}&quot;</span> 的卡
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-1 text-xs text-indigo-600 hover:underline"
          >
            清除搜索
          </button>
        </div>
      )}
    </div>
  );
}

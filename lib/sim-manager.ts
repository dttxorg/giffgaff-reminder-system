import { filterSimsByQuery } from "./sim-search";

export type SimManagerFilter = "all" | "attention" | "window" | "missing" | "paused";
export type SimManagerSort = "priority" | "number" | "recent";
export type SimAttention = "overdue" | "window" | "missing" | "normal" | "paused";

export interface SimManagerItemBase {
  id: number;
  phoneNumber: string;
  status: "active" | "paused";
  missingChannel: boolean;
  dayOffset: number;
  createdAt: string;
}

export interface SimManagerCounts {
  all: number;
  attention: number;
  window: number;
  missing: number;
  paused: number;
}

const ATTENTION_RANK: Record<SimAttention, number> = {
  overdue: 0,
  window: 1,
  missing: 2,
  normal: 3,
  paused: 4,
};

/**
 * 号码管理器里的唯一优先级来源。
 * 暂停卡始终放到最后；其余号码按“已超期 → 窗口内 → 缺渠道 → 正常”排序。
 */
export function getSimAttention(sim: Pick<SimManagerItemBase, "status" | "missingChannel" | "dayOffset">): SimAttention {
  if (sim.status === "paused") return "paused";
  if (sim.dayOffset > 180) return "overdue";
  if (sim.dayOffset >= 170) return "window";
  if (sim.missingChannel) return "missing";
  return "normal";
}

export function getSimManagerCounts<T extends SimManagerItemBase>(sims: T[]): SimManagerCounts {
  return sims.reduce<SimManagerCounts>(
    (counts, sim) => {
      const attention = getSimAttention(sim);
      counts.all += 1;
      if (attention === "overdue" || attention === "window" || attention === "missing") {
        counts.attention += 1;
      }
      if (attention === "window") counts.window += 1;
      if (sim.missingChannel) counts.missing += 1;
      if (sim.status === "paused") counts.paused += 1;
      return counts;
    },
    { all: 0, attention: 0, window: 0, missing: 0, paused: 0 }
  );
}

export function matchesSimManagerFilter(
  sim: SimManagerItemBase,
  filter: SimManagerFilter
): boolean {
  const attention = getSimAttention(sim);
  if (filter === "all") return true;
  if (filter === "attention") {
    return attention === "overdue" || attention === "window" || attention === "missing";
  }
  if (filter === "window") return attention === "window";
  if (filter === "missing") return sim.missingChannel;
  return sim.status === "paused";
}

export function sortSimManagerItems<T extends SimManagerItemBase>(
  sims: T[],
  sort: SimManagerSort
): T[] {
  return [...sims].sort((a, b) => {
    if (sort === "number") {
      return a.phoneNumber.localeCompare(b.phoneNumber, "en", { numeric: true }) || a.id - b.id;
    }
    if (sort === "recent") {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id;
    }

    const rankDiff = ATTENTION_RANK[getSimAttention(a)] - ATTENTION_RANK[getSimAttention(b)];
    if (rankDiff !== 0) return rankDiff;

    // 同一优先级内，天数越大越接近（或越超过）截止日，越应该排在前面。
    return b.dayOffset - a.dayOffset || a.phoneNumber.localeCompare(b.phoneNumber, "en", { numeric: true });
  });
}

export function filterAndSortSimManagerItems<T extends SimManagerItemBase>(
  sims: T[],
  query: string,
  filter: SimManagerFilter,
  sort: SimManagerSort
): T[] {
  const searched = filterSimsByQuery(sims, query);
  return sortSimManagerItems(
    searched.filter((sim) => matchesSimManagerFilter(sim, filter)),
    sort
  );
}

export function formatSimTiming(sim: Pick<SimManagerItemBase, "status" | "dayOffset">): string {
  if (sim.status === "paused") return "已暂停监控";
  if (sim.dayOffset > 180) return `已超期 ${sim.dayOffset - 180} 天`;
  if (sim.dayOffset === 180) return "今天截止";
  if (sim.dayOffset >= 170) return `距截止 ${180 - sim.dayOffset} 天`;
  if (sim.dayOffset < 0) return "尚未到激活日";
  return `距提醒 ${170 - sim.dayOffset} 天`;
}

export function pickDefaultManagedSim<T extends SimManagerItemBase>(sims: T[]): T | null {
  return sortSimManagerItems(sims, "priority")[0] ?? null;
}

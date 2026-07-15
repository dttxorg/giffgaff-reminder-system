import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

const getCachedPublicStats = unstable_cache(
  async () => {
    const [simCount, sentCount] = await Promise.all([
      prisma.sim.count(),
      prisma.reminderSent.count({ where: { status: "success" } }),
    ]);
    return { simCount, sentCount };
  },
  ["home-public-stats-v1"],
  { revalidate: 300 }
);

export function PublicStatsContent({
  simCount,
  sentCount,
}: {
  simCount: number;
  sentCount: number;
}) {
  if (simCount <= 0) return null;
  return (
    <p className="mt-5 text-sm text-slate-500" aria-label="服务使用数据">
      已守护 <strong className="font-semibold text-slate-800">{simCount}</strong> 个号码
      {sentCount > 0 && (
        <>
          <span className="mx-2 text-slate-300" aria-hidden="true">/</span>
          已送达 <strong className="font-semibold text-slate-800">{sentCount}</strong> 条提醒
        </>
      )}
    </p>
  );
}

export async function PublicStats() {
  let stats: { simCount: number; sentCount: number };
  try {
    stats = await getCachedPublicStats();
  } catch (error) {
    // 公开统计不是核心内容，数据库冷启动或短暂故障不应阻塞首页。
    console.error("[home] Failed to load public stats", error);
    return null;
  }
  return <PublicStatsContent {...stats} />;
}

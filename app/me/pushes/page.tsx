// Round 174: /me 推送历史列表(完整推送记录)
// - 替代 /me 主页"还有 N 条历史" 的浅层提示
// - 默认显示全部 (sim 推送数一般 < 100)
// - 按 sentAt 倒序
// - 显示 sentAt / status / dayOffset / 错误信息
// - 用户可看完整透明度

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatRelativeTime, formatUtcShanghaiDual } from "@/lib/date";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function MePushesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { status } = await searchParams;

  // Round 174: 只接受合法 SendStatus enum 值
  const validStatus: "success" | "failed" | undefined =
    status === "success" || status === "failed" ? status : undefined;
  const where = {
    simId: user.sim.id,
    ...(validStatus ? { status: validStatus } : {}),
  };

  const reminders = await prisma.reminderSent.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 200, // 兜底上限,避免一次查太多
  });

  const successCount = reminders.filter((r) => r.status === "success").length;
  const failedCount = reminders.filter((r) => r.status === "failed").length;
  const totalShown = reminders.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4">
        <Link
          href="/me"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← 返回用户中心
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">推送历史</h1>
      <p className="text-sm text-slate-500 mb-6">
        共 {totalShown} 条 ·{" "}
        <strong className="text-emerald-700">{successCount}</strong> 成功 ·{" "}
        <strong className={failedCount > 0 ? "text-rose-700" : "text-slate-500"}>
          {failedCount}
        </strong>{" "}
        失败
        {status && (
          <span className="ml-2 text-slate-400">
            (过滤: {status})
            {" · "}
            <Link href="/me/pushes" className="text-indigo-600 hover:underline">
              清除
            </Link>
          </span>
        )}
      </p>

      {/* 过滤链接 */}
      <div className="flex gap-2 mb-4 text-xs">
        <Link
          href="/me/pushes"
          className={
            !status
              ? "px-2 py-1 rounded bg-indigo-600 text-white"
              : "px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
          }
        >
          全部
        </Link>
        <Link
          href="/me/pushes?status=success"
          className={
            status === "success"
              ? "px-2 py-1 rounded bg-emerald-600 text-white"
              : "px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
          }
        >
          成功
        </Link>
        <Link
          href="/me/pushes?status=failed"
          className={
            status === "failed"
              ? "px-2 py-1 rounded bg-rose-600 text-white"
              : "px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
          }
        >
          失败
        </Link>
      </div>

      {reminders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          {status ? `没有 ${status === "success" ? "成功" : "失败"} 的推送` : "暂无推送记录"}
        </div>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-xs text-slate-500">
                  {formatRelativeTime(r.sentAt)}
                </span>
                <span
                  className={
                    r.status === "success"
                      ? "px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800"
                      : "px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800"
                  }
                >
                  {r.status === "success" ? "送达" : "失败"}
                </span>
              </div>
              <div className="text-sm text-slate-700 font-medium">
                保号第 {r.dayOffset} 天 · 第 {r.bucket + 1} 次
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {formatUtcShanghaiDual(r.sentAt)}
              </div>
              {r.errorMessage && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-50 rounded p-2 break-words">
                  {r.errorMessage}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

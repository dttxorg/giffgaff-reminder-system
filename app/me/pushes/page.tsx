// Round 174+175: /me 推送历史完整列表页 (按日分组折叠)
// - Round 174: 完整推送列表 + 状态过滤
// - Round 175: 按日分组,每天是 <details> 默认展开,便于浏览

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatRelativeTime, formatUtcShanghaiDual } from "@/lib/date";
import { groupRemindersByDay } from "@/lib/push-grouping";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}



export default async function MePushesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { status } = await searchParams;

  const validStatus: "success" | "failed" | undefined =
    status === "success" || status === "failed" ? status : undefined;
  const where = {
    simId: user.sim.id,
    ...(validStatus ? { status: validStatus } : {}),
  };

  const reminders = await prisma.reminderSent.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 200,
  });

  const successCount = reminders.filter((r) => r.status === "success").length;
  const failedCount = reminders.filter((r) => r.status === "failed").length;
  const totalShown = reminders.length;

  // Round 175: 按日分组(用 lib/push-grouping 纯函数,可测)
  const groups = groupRemindersByDay(reminders);

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

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          {status ? `没有 ${status === "success" ? "成功" : "失败"} 的推送` : "暂无推送记录"}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {

            const dayFailed = g.reminders.filter((r) => r.status === "failed").length;
            return (
              <details
                key={g.dateKey}
                open
                className="bg-white rounded-xl border border-slate-200"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{g.label}</span>
                  <span className="text-xs text-slate-500">
                    {g.reminders.length} 条
                    {dayFailed > 0 ? (
                      <span className="ml-1 text-rose-600">· {dayFailed} 失败</span>
                    ) : (
                      <span className="ml-1 text-emerald-600">· 全部成功</span>
                    )}
                  </span>
                </summary>
                <ul className="border-t border-slate-100 divide-y divide-slate-100">
                  {g.reminders.map((r) => (
                    <li key={r.id} className="px-4 py-3">
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
                      <div className="text-sm text-slate-700">
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
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

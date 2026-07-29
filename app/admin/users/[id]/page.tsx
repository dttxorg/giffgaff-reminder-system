import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatRelativeTime } from "@/lib/date";
import { UsersClient } from "../users-client";
import { DeleteUserButton } from "./delete-user-button";
import { parsePositiveIntParam } from "@/lib/route-params";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const userId = parsePositiveIntParam(id);
  if (userId === null) {
    notFound();
  }

  const [user, recentReminders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        createdAt: true,
        _count: { select: { reminders: true } },
        sims: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            phoneNumber: true,
            activatedAt: true,
            lastPortedAt: true,
            channel: true,
            status: true,
            carrier: true,
            reminderStartDay: true,
            cycleDays: true,
          },
        },
      },
    }),
    prisma.reminderSent.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true,
        dayOffset: true,
        bucket: true,
        sentAt: true,
        status: true,
        errorMessage: true,
        simId: true,
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const sims = user.sims;
  const reminderCount = user._count.reminders;

  // 给 UsersClient 的 row(重置密码按钮用)
  const row = {
    id: user.id,
    username: user.username,
    simPhones: sims.map((s) => s.phoneNumber),
    channels: Array.from(new Set(sims.map((s) => s.channel))),
    reminderCount: 0,
    createdAt: user.createdAt.toISOString().replace("T", " ").slice(0, 19),
    hasPassword: !!user.passwordHash,
  };

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          用户 <span className="font-mono">{user.username}</span>
        </h1>
        <Link
          href="/admin/users"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← 返回列表
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {/* 用户信息卡 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">账户信息</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">用户 ID</dt>
              <dd className="font-mono text-slate-700">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">账号</dt>
              <dd className="font-mono text-slate-700">{user.username}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">SIM 卡数</dt>
              <dd>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                  {sims.length} 张
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">密码</dt>
              <dd>
                {user.passwordHash ? (
                  <span className="text-emerald-700 text-xs inline-flex items-center gap-0.5">
                    <svg
                      width={10}
                      height={10}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    已设置
                  </span>
                ) : (
                  <span className="text-rose-700 text-xs">未设置</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">注册时间</dt>
              <dd>
                <div className="text-slate-700">{formatRelativeTime(user.createdAt)}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {user.createdAt.toISOString().slice(0, 19)} UTC
                </div>
              </dd>
            </div>
          </dl>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <UsersClient users={[row]} />
          </div>
        </div>

        {/* SIM 信息卡 - 多 SIM 时分别展示 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            SIM 信息 ({sims.length})
          </h2>
          {sims.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              该账号下还没有绑定 SIM 卡
            </p>
          ) : (
            <div className="space-y-3">
              {sims.map((sim, idx) => {
                const baseline = sim.lastPortedAt ?? sim.activatedAt;
                const days = dayOffsetFromBaseline(baseline);
                const inWindow = isInReminderWindow(days, sim);
                return (
                  <div
                    key={sim.id}
                    className={`${
                      idx > 0 ? "pt-3 border-t border-slate-100" : ""
                    }`}
                  >
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between items-center">
                        <dt className="text-slate-500">号码</dt>
                        <dd>
                          <Link
                            href={`/admin/sims/${sim.id}`}
                            prefetch={false}
                            className="font-mono text-indigo-600 hover:underline"
                          >
                            {formatPhoneForDisplay(sim.phoneNumber)}
                          </Link>
                          {idx === 0 && (
                            <span className="ml-1 text-[10px] text-indigo-600">(主)</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">运营商 / 规则</dt>
                        <dd className="text-xs text-slate-700">
                          {sim.carrier === "giffgaff" ? "Giffgaff" : "CTExcel"} ·{" "}
                          {sim.reminderStartDay}/{sim.cycleDays} 天
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">渠道</dt>
                        <dd>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                            {sim.channel}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">状态</dt>
                        <dd>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              sim.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {sim.status}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">已激活</dt>
                        <dd>
                          <div className="text-slate-700">
                            <span className="font-medium">{days}</span> 天
                          </div>
                          {inWindow && (
                            <div className="text-xs text-amber-700 mt-0.5">
                              提醒窗口内({sim.reminderStartDay}-{sim.cycleDays})
                            </div>
                          )}
                          {days > sim.cycleDays && (
                            <div className="text-xs text-rose-700 mt-0.5">
                              已超 {sim.cycleDays} 天
                            </div>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3 flex-wrap">
            {sims.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sims/${s.id}`}
                prefetch={false}
                className="text-xs text-indigo-600 hover:underline"
              >
                编辑 **** {s.phoneNumber.slice(-4)} →
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 最近推送 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">最近 5 条推送</h2>
          <Link
            href={`/admin/reminders?userId=${user.id}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        {recentReminders.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">暂无推送记录</p>
        ) : (
          <ul className="space-y-2">
            {recentReminders.map((r) => {
              const sim = sims.find((s) => s.id === r.simId);
              return (
                <li
                  key={r.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                      r.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-slate-700">
                        第 {r.dayOffset} 天 · 第 {r.bucket + 1} 桶
                        {sim && (
                          <span className="ml-2 text-xs text-slate-500 font-mono">
                            {sim.phoneNumber}
                          </span>
                        )}
                      </span>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${
                          r.status === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.status === "success" ? "送达" : "失败"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 mt-0.5">
                      {formatRelativeTime(r.sentAt)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {r.sentAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                    </div>
                    {r.errorMessage && (
                      <div
                        className="text-xs text-rose-700 mt-1 break-words"
                        title={r.errorMessage}
                      >
                        {r.errorMessage.length > 80
                          ? r.errorMessage.slice(0, 80) + "…"
                          : r.errorMessage}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 危险操作 */}
      <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-rose-900 mb-2">危险操作</h2>
        <p className="text-xs text-rose-700 mb-3">
          删除用户是不可逆操作。账号下所有 SIM 卡会变成「孤卡」(userId=NULL),
          不会被删除,可被新用户兑换认领。
        </p>
        <DeleteUserButton userId={user.id} reminderCount={reminderCount} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatRelativeTime } from "@/lib/date";
import { UsersClient } from "../users-client";
import { DeleteUserButton } from "./delete-user-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const userId = parseInt(id, 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    notFound();
  }

  // 并行取 user + 最近 5 条推送
  const [user, recentReminders, reminderCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { sim: true },
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
    prisma.reminderSent.count({ where: { userId } }),
  ]);

  if (!user) {
    notFound();
  }

  // 兜底:sim 已被管理员解绑 → 显式提示
  if (!user.sim) {
    return (
      <div className="p-6 sm:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            用户 <span className="font-mono">{user.username}</span>
          </h1>
          <Link href="/admin/users" className="text-sm text-slate-500 hover:text-slate-900">
            ← 返回列表
          </Link>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-amber-900">
            该账号下没有 SIM 卡(可能已删除/未兑换)。
          </p>
        </div>
      </div>
    );
  }

  // 派生:sim 信息 / day offset / 提醒窗口
  const sim = user.sim;
  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const days = dayOffsetFromBaseline(baseline);
  const inWindow = isInReminderWindow(days);

  // 给 <UsersClient> 的 row(让"重置密码"按钮能复用)
  const row = {
    id: user.id,
    username: user.username,
    simPhone: sim.phoneNumber,
    channel: user.channel,
    reminderCount: 0, // 不在详情页算,列表语义;详情页另算
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
              <dt className="text-slate-500">渠道</dt>
              <dd>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                  {user.channel}
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

        {/* SIM 信息卡 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">SIM 信息</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">号码</dt>
              <dd>
                <Link
                  href={`/admin/sims/${sim.id}`}
                  className="font-mono text-indigo-600 hover:underline"
                >
                  {formatPhoneForDisplay(sim.phoneNumber)}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">sim ID</dt>
              <dd className="font-mono text-slate-700">{sim.id}</dd>
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
                  <div className="text-xs text-amber-700 mt-0.5">提醒窗口内(170-180)</div>
                )}
                {days > 180 && (
                  <div className="text-xs text-rose-700 mt-0.5">已超 180 天</div>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              href={`/admin/sims/${sim.id}`}
              className="text-xs text-indigo-600 hover:underline"
            >
              编辑 SIM →
            </Link>
          </div>
        </div>
      </div>

      {/* 最近推送 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">最近 5 条推送</h2>
          <Link
            href={`/admin/reminders?simId=${sim.id}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        {recentReminders.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">暂无推送记录</p>
        ) : (
          <ul className="space-y-2">
            {recentReminders.map((r) => (
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
            ))}
          </ul>
        )}
      </div>

      {/* 危险操作 */}
      <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-rose-900 mb-2">危险操作</h2>
        <p className="text-xs text-rose-700 mb-3">
          删除用户是不可逆操作。sim 号码会保留（user.simId → NULL,变成孤卡）,
          可被新用户兑换认领。
        </p>
        <DeleteUserButton userId={user.id} reminderCount={reminderCount} />
      </div>
    </div>
  );
}

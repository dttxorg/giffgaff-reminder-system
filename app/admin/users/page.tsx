import Link from "next/link";

import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { UsersClient } from "./users-client";
import { AdminStat } from "../_components/admin-stat";
import type { Prisma } from "@/lib/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{ channel?: string; password?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { channel, password } = await searchParams;

  // U5: 按 channel 和 password 状态筛选
  const where: Prisma.UserWhereInput = {};
  if (
    channel === "serverchan" ||
    channel === "bark" ||
    channel === "pushplus" ||
    channel === "telegram"
  ) {
    where.channel = channel;
  }
  if (password === "yes") where.passwordHash = { not: null };
  if (password === "no") where.passwordHash = null;

  // 列表 + 概览并行(无 filter)
  const [users, totalUsers, withPwd, noPwd] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: "desc" },
      take: 200,
      include: { sim: true, _count: { select: { reminders: true } } },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { passwordHash: { not: null } } }),
    prisma.user.count({ where: { passwordHash: null } }),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    simPhone: u.sim.phoneNumber,
    simLookupKey: u.simLookupKey,
    channel: u.channel,
    reminderCount: u._count.reminders,
    createdAt: u.createdAt.toISOString().replace("T", " ").slice(0, 19),
    hasPassword: !!u.passwordHash,
  }));

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-4">用户列表</h1>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <AdminStat label="用户总数" value={totalUsers} />
        <AdminStat
          label="已设密码"
          value={withPwd}
          sub={totalUsers > 0 ? `占比 ${Math.round((withPwd / totalUsers) * 100)}%` : "—"}
          tone="emerald"
        />
        <AdminStat
          label="未设密码"
          value={noPwd}
          sub={totalUsers > 0 ? `占比 ${Math.round((noPwd / totalUsers) * 100)}%` : "—"}
          tone="amber"
        />
      </div>
      <div className="flex items-center justify-end mb-6 flex-wrap gap-3">
        <a
          href={`/api/admin/users/export${buildExportQS(channel, password)}`}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          ⬇ 导出 CSV
        </a>
      </div>

      {/* U5: 筛选 — 服务管理员快速定位 "没设密码" 或 "用 Bark 的所有用户" */}
      <form className="mb-4 flex gap-2 flex-wrap">
        <select
          name="channel"
          defaultValue={channel || ""}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        >
          <option value="">全部渠道</option>
          <option value="serverchan">Sever酱</option>
          <option value="bark">Bark</option>
          <option value="pushplus">pushplus</option>
          <option value="telegram">Telegram</option>
        </select>
        <select
          name="password"
          defaultValue={password || ""}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        >
          <option value="">密码:全部</option>
          <option value="yes">已设密码</option>
          <option value="no">未设密码</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          应用筛选
        </button>
        {(channel || password) && (
          <Link
            href="/admin/users"
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            清除
          </Link>
        )}
      </form>

      <UsersClient users={rows} />
    </div>
  );
}

/**
 * 复用当前页面的筛选条件构造 export query string
 * admin 点击"导出 CSV"即下载当前可见的子集
 */
function buildExportQS(
  channel: string | undefined,
  password: string | undefined
): string {
  const sp = new URLSearchParams();
  if (channel) sp.set("channel", channel);
  if (password) sp.set("password", password);
  const s = sp.toString();
  return s ? "?" + s : "";
}

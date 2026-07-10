import Link from "next/link";

import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { UsersClient } from "./users-client";
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

  const users = await prisma.user.findMany({
    where,
    orderBy: { id: "desc" },
    take: 200,
    include: { sim: true, _count: { select: { reminders: true } } },
  });

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
      <h1 className="text-2xl font-bold mb-6">用户列表</h1>

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

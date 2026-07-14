import Link from "next/link";

import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { UsersClient } from "./users-client";
import { AdminStat } from "../_components/admin-stat";
import { Pagination } from "../_components/pagination";
import { AutoSubmitForm } from "../_components/auto-submit-form";
import type { Prisma } from "@/lib/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{
    channel?: string;
    password?: string;
    page?: string;
    /** Round 195: 日期范围 (yyyy-MM-dd) */
    from?: string;
    to?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function UsersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { channel, password, page, from, to } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

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

  // Round 195: 日期范围 (createdAt) 过滤 (跟 /admin/sims 镜像)
  if (from || to) {
    const createdAtRange: { gte?: Date; lt?: Date } = {};
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      createdAtRange.gte = new Date(from + "T00:00:00Z");
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const lt = new Date(to + "T00:00:00Z");
      lt.setUTCDate(lt.getUTCDate() + 1);
      createdAtRange.lt = lt;
    }
    if (createdAtRange.gte || createdAtRange.lt) {
      where.createdAt = createdAtRange;
    }
  }

  // 列表 + 概览并行(无 filter)
  const [users, totalUsers, withPwd, noPwd, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { sim: true, _count: { select: { reminders: true } } },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { passwordHash: { not: null } } }),
    prisma.user.count({ where: { passwordHash: null } }),
    prisma.user.count({ where }), // 用于分页
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    username: u.username,
    simPhone: u.sim?.phoneNumber ?? null,
    channel: u.channel,
    reminderCount: u._count.reminders,
    createdAt: u.createdAt.toISOString().replace("T", " ").slice(0, 19),
    hasPassword: !!u.passwordHash,
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
      <AutoSubmitForm className="mb-4 flex gap-2 flex-wrap">
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
        {/* Round 195: 日期范围过滤 (跟 /admin/sims 镜像) */}
        <input
          name="from"
          defaultValue={from || ""}
          placeholder="起始日期"
          type="date"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        />
        <span className="text-slate-400">→</span>
        <input
          name="to"
          defaultValue={to || ""}
          placeholder="结束日期"
          type="date"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          应用筛选
        </button>
        {(channel || password || from || to) && (
          <Link
            href="/admin/users"
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            清除
          </Link>
        )}
      </AutoSubmitForm>

      {/* Round 196: 当前过滤状态提示 (date 范围 + channel + password) */}
      {(from || to || channel || password) && (
        <div className="mb-3 text-sm text-slate-600 flex items-center gap-2 flex-wrap">
          <span>当前过滤:</span>
          {channel && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              渠道 {channel}
            </span>
          )}
          {password && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              密码 {password === "yes" ? "已设" : "未设"}
            </span>
          )}
          {(from || to) && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {from || "..."} → {to || "..."}
            </span>
          )}
          <Link
            href="/admin/users"
            className="text-indigo-600 hover:underline text-xs"
          >
            清除全部
          </Link>
        </div>
      )}

      <UsersClient users={rows} />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        basePath="/admin/users"
        searchParams={
          new URLSearchParams(
            Object.entries({ channel, password })
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, String(v)])
          )
        }
      />
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

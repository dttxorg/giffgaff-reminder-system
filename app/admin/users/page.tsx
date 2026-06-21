import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

export default async function UsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    take: 200,
    include: { sim: true, _count: { select: { reminders: true } } },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">用户列表</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">绑定 sim</th>
                <th className="text-left px-3 py-2">后 6 位</th>
                <th className="text-left px-3 py-2">渠道</th>
                <th className="text-left px-3 py-2">提醒数</th>
                <th className="text-left px-3 py-2">注册时间 (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    暂无用户
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{u.id}</td>
                    <td className="px-3 py-2 font-mono">{u.sim.phoneNumber}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{u.simLookupKey}</td>
                    <td className="px-3 py-2">{u.channel}</td>
                    <td className="px-3 py-2 text-slate-500">{u._count.reminders}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {u.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

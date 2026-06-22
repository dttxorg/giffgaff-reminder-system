import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
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
      <UsersClient users={rows} />
    </div>
  );
}
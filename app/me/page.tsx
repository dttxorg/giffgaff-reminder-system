import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserDashboardContext } from "@/lib/session";
import { SimCard } from "./_components/sim-card";
import { SimManager, type SimManagerItem } from "./_components/sim-manager";
import { SimCardLoading } from "./_components/sim-card-loading";
import { PortCountdownHero } from "./_components/port-countdown-hero";
import { PortOverdueBanner } from "./_components/port-overdue-banner";
import { ActionBar } from "./_components/action-bar";
import { UserHeader } from "./_components/user-header";
import { EmptySims } from "./_components/empty-sims";
import { AccountReminderMode } from "./_components/account-reminder-mode";
import { MULTI_SIM_AGGREGATE_THRESHOLD } from "@/lib/account-reminder";

interface PageProps {
  searchParams: Promise<{ simId?: string }>;
}

export default async function MePage({ searchParams }: PageProps) {
  const { simId: simIdParam } = await searchParams;
  const requestedSimId =
    simIdParam && /^\d+$/.test(simIdParam) && String(Number(simIdParam)) === simIdParam
      ? Number(simIdParam)
      : null;
  const user = await getCurrentUserDashboardContext(requestedSimId);
  if (!user) redirect("/login");

  const sims = user.sims;
  const simCount = sims.length;
  const activeSimCount = sims.filter((sim) => sim.status === "active").length;
  // 同一请求内多 SimCard 共用一个 now,保证 timeline 一致
  const now = new Date();

  const managerSims: SimManagerItem[] = sims.map((sim, index) => ({
    id: sim.id,
    phoneNumber: sim.phoneNumber,
    status: sim.status,
    missingChannel: sim.missingChannel,
    dayOffset: sim.dayOffset,
    createdAt: sim.createdAt.toISOString(),
    channel: sim.channel,
    carrier: sim.carrier,
    reminderStartDay: sim.reminderStartDay,
    cycleDays: sim.cycleDays,
    isPrimary: index === 0,
  }));

  // URL 指定号码优先；否则 SQL 使用与列表一致的关注优先级选择当前卡。
  const activeSim = user.activeSim;

  return (
    <div className={`${simCount > 1 ? "max-w-5xl" : "max-w-md"} mx-auto px-4 py-6 sm:px-6 sm:py-8`}>
      {/* Round 221: 顶部用户卡片(头像 + 用户名 + SIM 卡数 + 在线状态) */}
      <UserHeader username={user.username} simCount={simCount} />

      {activeSimCount > MULTI_SIM_AGGREGATE_THRESHOLD && (
        <AccountReminderMode simCount={activeSimCount} />
      )}

      {/* Round 222: 0 张卡的友好空状态 */}
      {simCount === 0 && (
        <EmptySims availableReminderSlots={user.availableReminderSlots} />
      )}

      {activeSim && (
        <div className={simCount > 1 ? "lg:grid lg:grid-cols-[20rem_minmax(0,28rem)] lg:items-start lg:justify-center lg:gap-6" : ""}>
          {/* Round 227: 50+ 号码可扩展的主列表；单卡时不显示管理器。 */}
          {simCount > 1 && (
            <SimManager sims={managerSims} activeSimId={activeSim.id} />
          )}

          <div className="min-w-0">
            {/* 当前号码进入自定义提醒窗口后显示倒计时。 */}
            <PortCountdownHero
              baseline={activeSim.lastPortedAt ?? activeSim.activatedAt}
              portToken={activeSim.portToken}
              simId={activeSim.id}
              now={now}
              carrier={activeSim.carrier}
              reminderStartDay={activeSim.reminderStartDay}
              cycleDays={activeSim.cycleDays}
            />

            {/* 当前号码超过自定义截止日后显示警示。 */}
            <PortOverdueBanner
              baseline={activeSim.lastPortedAt ?? activeSim.activatedAt}
              portToken={activeSim.portToken}
              simId={activeSim.id}
              now={now}
              carrier={activeSim.carrier}
              cycleDays={activeSim.cycleDays}
            />

            {/* 号码列表先可用；详情统计完成后再流式补齐。 */}
            <Suspense fallback={<SimCardLoading />}>
              <SimCard
                sim={{
                  id: activeSim.id,
                  phoneNumber: activeSim.phoneNumber,
                  activatedAt: activeSim.activatedAt,
                  lastPortedAt: activeSim.lastPortedAt,
                  portToken: activeSim.portToken,
                  status: activeSim.status,
                  channel: activeSim.channel,
                  channelKey: activeSim.channelKey,
                  carrier: activeSim.carrier,
                  reminderStartDay: activeSim.reminderStartDay,
                  cycleDays: activeSim.cycleDays,
                }}
                isPrimary={activeSim.id === sims[0].id}
                now={now}
              />
            </Suspense>

            {/* Round 218: 底部 action bar(改用 pill 按钮,带 icon) */}
            <ActionBar
              activeSimId={activeSim.id}
              availableReminderSlots={user.availableReminderSlots}
            />
          </div>
        </div>
      )}
    </div>
  );
}

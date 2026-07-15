import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { SimCard } from "./_components/sim-card";
import { SimTabs } from "./_components/sim-tabs";
import { PortCountdownHero } from "./_components/port-countdown-hero";
import { PortOverdueBanner } from "./_components/port-overdue-banner";
import { ActionBar } from "./_components/action-bar";

interface PageProps {
  searchParams: Promise<{ simId?: string }>;
}

export default async function MePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { simId: simIdParam } = await searchParams;
  const sims = user.sims;
  const simCount = sims.length;
  // 同一请求内多 SimCard 共用一个 now,保证 timeline 一致
  const now = new Date();

  // 选中的 sim:?simId=X 优先,否则默认 sims[0]
  const activeSim =
    sims.find((s) => String(s.id) === simIdParam) ?? sims[0] ?? null;

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8">
      {/* 顶部欢迎:用账号(username),不用手机号(脱敏) */}
      <div className="mb-3">
        <p className="text-sm text-slate-500">欢迎</p>
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
          <span className="font-mono">{user.username}</span>
          {simCount > 0 && (
            <span className="text-base font-normal text-slate-500">
              · {simCount} 张 SIM 卡
            </span>
          )}
        </h1>
      </div>

      {/* 0 张卡:提示去兑换 */}
      {simCount === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-slate-700 mb-3">您的账号还没绑定任何 SIM 卡</p>
          <Link
            href="/redeem"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            去兑换卡密 →
          </Link>
        </div>
      )}

      {/* 多卡场景:顶部 tabs 切换(单卡不显示 tabs,直接渲染) */}
      {simCount > 1 && activeSim && (
        <SimTabs
          sims={sims.map((s) => ({
            id: s.id,
            phoneNumber: s.phoneNumber,
            phoneTail4: s.phoneNumber.slice(-4),
            status: s.status,
            // 简易预警:没设渠道时打个小红点
            missingChannel: !s.channelKey,
          }))}
          activeSimId={activeSim.id}
        />
      )}

      {/* Round 216: 保号窗口 hero 倒计时(170-180 窗口期内才显示) */}
      {activeSim && (
        <PortCountdownHero
          baseline={activeSim.lastPortedAt ?? activeSim.activatedAt}
          portToken={activeSim.portToken}
          simId={activeSim.id}
          now={now}
        />
      )}

      {/* Round 217: 已过保号窗口警示(180+ 天) */}
      {activeSim && (
        <PortOverdueBanner
          baseline={activeSim.lastPortedAt ?? activeSim.activatedAt}
          portToken={activeSim.portToken}
          simId={activeSim.id}
          now={now}
        />
      )}

      {/* 只渲染选中那一张 sim */}
      {activeSim && (
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
          }}
          isPrimary={activeSim.id === sims[0].id}
          now={now}
        />
      )}

      {/* Round 218: 底部 action bar(改用 pill 按钮,带 icon) */}
      {simCount > 0 && <ActionBar activeSimId={activeSim?.id ?? null} />}
    </div>
  );
}

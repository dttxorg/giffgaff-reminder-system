import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserSettingsContext } from "@/lib/session";
import { MeSettingsClient } from "./settings-client";
import { PushPreview } from "@/app/_components/push-preview";
import { SimSettingsPicker } from "./sim-settings-picker";

type Channel = "serverchan" | "bark" | "pushplus" | "telegram";

interface PageProps {
  searchParams: Promise<{ channel?: string; simId?: string }>;
}

function parseChannel(input: string | undefined): Channel {
  if (input === "serverchan" || input === "bark" || input === "pushplus" || input === "telegram") {
    return input;
  }
  return "serverchan";
}

/**
 * /me/settings 页面
 *
 * 处理账号级 + sim 级两类设置:
 *  1) 账号级: 改密码
 *  2) sim 级: 每张 sim 的 channel/channelKey + 激活日期
 *     通过 ?simId=X 切换卡
 */
export default async function MeSettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUserSettingsContext();
  if (!user) redirect("/login");

  const { channel: channelParam, simId: simIdParam } = await searchParams;
  const sims = user.sims;
  if (sims.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 sm:py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">设置</h1>
        <p className="text-slate-600 mb-4">该账号还没绑定 SIM 卡</p>
        <Link
          href="/redeem"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          去兑换卡密 →
        </Link>
      </div>
    );
  }
  const selectedSim =
    sims.find((s) => String(s.id) === simIdParam) ?? sims[0];

  // 默认 channel:优先用 URL(帮助页 deep-link),否则用当前 sim 的 channel
  const initialChannel = channelParam
    ? parseChannel(channelParam)
    : parseChannel(selectedSim.channel);
  const isFirstTime = !selectedSim.channelKey;
  const activatedAt = selectedSim.activatedAt.toISOString().slice(0, 10);

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4">
        <Link href="/me" className="text-sm text-slate-500 hover:text-slate-900">
          ← 返回用户中心
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">设置</h1>
      <p className="text-sm text-slate-500 mb-6">
        账号 <span className="font-mono text-slate-700">{user.username}</span>
        {sims.length > 1 && ` · 当前编辑第 ${sims.indexOf(selectedSim) + 1} 张 SIM 卡`}
      </p>

      {/* 多卡切换：单个原生选择器可稳定承载 50+ 号码，不渲染预取链接墙。 */}
      {sims.length > 1 && (
        <SimSettingsPicker
          sims={sims.map((sim, index) => ({
            id: sim.id,
            phoneNumber: sim.phoneNumber,
            isPrimary: index === 0,
          }))}
          activeSimId={selectedSim.id}
        />
      )}

      <h2 className="text-lg font-semibold mb-3">
        通知渠道 ({sims.length > 1 ? `第 ${sims.indexOf(selectedSim) + 1} 张` : "本卡"})
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        每张 SIM 卡可独立设置推送渠道。账号下所有卡用同一渠道(批量复制)
        或各卡不同(独立设置)都支持 — 在下面表单里改当前卡的,其它卡不受影响。
      </p>
      <MeSettingsClient
        initialChannel={initialChannel}
        initialChannelKey={selectedSim.channelKey}
        isFirstTime={isFirstTime}
        activatedAt={activatedAt}
        simId={selectedSim.id}
      />

      {/* 推送样例预览:显示当前选中 sim 的样例推送 */}
      <details className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6 group">
        <summary className="cursor-pointer list-none flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 inline-flex items-center gap-1.5">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-indigo-600"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            查看推送样例
          </span>
          <span aria-hidden="true" className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <p className="text-xs text-slate-500 mt-2 mb-3">
          折叠打开,看系统到日子会给您发什么。模板由管理员设置,改渠道不影响内容。
        </p>
        <Suspense
          fallback={
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" role="status">
              <span className="sr-only">正在加载推送样例</span>
            </div>
          }
        >
          <PushPreview
            phoneNumber={selectedSim.phoneNumber}
            days={Math.max(
              0,
              Math.floor(
                (Date.now() -
                  new Date(
                    selectedSim.lastPortedAt ?? selectedSim.activatedAt
                  ).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )}
            portToken={selectedSim.portToken}
            simIdFallback={selectedSim.id}
          />
        </Suspense>
      </details>
    </div>
  );
}

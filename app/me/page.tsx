import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { SimCard } from "./_components/sim-card";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sims = user.sims;
  const simCount = sims.length;
  // 同一请求内多 SimCard 共用一个 now,保证 timeline 一致
  const now = new Date();

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      {/* 顶部欢迎:用账号(username),不用手机号(脱敏) */}
      <div className="mb-4">
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

      {/* 每张卡渲染一个 SimCard */}
      {sims.map((sim, idx) => (
        <div key={sim.id} className={idx > 0 ? "mt-8 pt-8 border-t border-slate-200" : ""}>
          <SimCard
            sim={{
              id: sim.id,
              phoneNumber: sim.phoneNumber,
              activatedAt: sim.activatedAt,
              lastPortedAt: sim.lastPortedAt,
              portToken: sim.portToken,
              status: sim.status,
              channel: sim.channel,
              channelKey: sim.channelKey,
            }}
            isPrimary={idx === 0}
            indexLabel={simCount > 1 ? `副卡 #${idx + 1}` : undefined}
            now={now}
          />
        </div>
      ))}

      {/* 账号级操作(多卡时也只放在最后,避免重复) */}
      {simCount > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
            <Link
              href="/me/settings"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
              title="修改密码 / 各 SIM 卡的推送渠道 / 激活日期"
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              设置
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/redeem"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
              title="用新卡密把第 N+1 张 SIM 卡绑定到本账号"
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              绑定更多 SIM 卡
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/api/auth/logout"
              className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
              title="退出登录"
            >
              退出
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

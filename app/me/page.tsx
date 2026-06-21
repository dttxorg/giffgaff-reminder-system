import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import { formatPhoneForDisplay } from "@/lib/phone";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sim = user.sim;
  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const dayOffset = dayOffsetFromBaseline(baseline);
  const inWindow = isInReminderWindow(dayOffset);

  const phoneTail4 = sim.phoneNumber.slice(-4);

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4">
        <p className="text-sm text-slate-500">欢迎</p>
        <h1 className="text-2xl font-bold">用户 **** {phoneTail4}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
        <div className="text-sm text-slate-500 mb-1">我的号码</div>
        <div className="text-2xl font-mono font-semibold mb-3 tracking-wider">
          {formatPhoneForDisplay(sim.phoneNumber)}
        </div>
        <div className="text-sm text-slate-500 mb-1">激活日期</div>
        <div className="text-base mb-3">
          {sim.activatedAt.toISOString().slice(0, 10)}
          {sim.lastPortedAt && (
            <span className="ml-2 text-xs text-slate-500">
              (上次保号 {sim.lastPortedAt.toISOString().slice(0, 10)})
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500 mb-1">已激活</div>
        <div className="text-3xl font-bold text-indigo-600">
          {dayOffset} <span className="text-base font-normal text-slate-500">天</span>
        </div>

        {inWindow && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            ⚠️ 已进入保号提醒窗口,请尽快保号
          </div>
        )}
      </div>

      <Link
        href={`/p/${sim.id}`}
        className="block w-full text-center py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
      >
        立即去保号
      </Link>

      <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="text-sm text-slate-500 mb-1">推送渠道</div>
        <div className="text-base mb-1">
          {user.channel === "serverchan" ? "Sever酱" : "Bark"}
        </div>
        <div className="text-xs text-slate-400 font-mono break-all">
          {user.channelKey.slice(0, 12)}****
        </div>
        <div className="mt-3 text-xs text-slate-500">
          想换渠道?重新登录一次即可,新渠道会覆盖旧的
        </div>
      </div>
    </div>
  );
}

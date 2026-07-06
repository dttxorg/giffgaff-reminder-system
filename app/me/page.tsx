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
  const channelMissing = !user.channelKey;

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4">
        <p className="text-sm text-slate-500">欢迎</p>
        <h1 className="text-2xl font-bold">用户 **** {phoneTail4}</h1>
      </div>

      {channelMissing && (
        <Link
          href="/me/settings"
          className="block mb-4 p-4 rounded-lg bg-rose-50 border-2 border-rose-300 hover:bg-rose-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="font-semibold text-rose-900">您还没设置通知渠道</div>
              <div className="text-sm text-rose-700 mt-0.5">
                没有通知渠道,系统无法在保号日给您发提醒。
                <span className="text-rose-900 underline ml-1">立即设置 →</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
        <div className="text-sm text-slate-500 mb-1">我的号码</div>
        <div className="text-2xl font-mono font-semibold mb-3 tracking-wider">
          {formatPhoneForDisplay(sim.phoneNumber)}
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-slate-500">激活日期</div>
          <Link
            href="/me/settings#sim-info"
            className="text-xs text-indigo-600 hover:underline"
          >
            修改
          </Link>
        </div>
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
        className="block w-full text-center py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm mb-3"
      >
        立即去保号
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-slate-500">推送渠道</div>
          <Link
            href="/me/settings"
            className="text-xs text-indigo-600 hover:underline"
          >
            {channelMissing ? "去设置" : "修改"}
          </Link>
        </div>
        {channelMissing ? (
          <div className="text-base text-rose-600 font-medium">未设置</div>
        ) : (
          <>
            <div className="text-base mb-1">
              {user.channel === "serverchan" ? "Sever酱" : "Bark"}
            </div>
            <div className="text-xs text-slate-400 font-mono break-all">
              {user.channelKey.slice(0, 12)}****
            </div>
          </>
        )}
      </div>
    </div>
  );
}

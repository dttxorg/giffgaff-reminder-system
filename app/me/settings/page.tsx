import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { MeSettingsClient } from "./settings-client";

export default async function MeSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isFirstTime = !user.channelKey;
  const initialChannel = (user.channel as "serverchan" | "bark") || "serverchan";
  const activatedAt = user.sim.activatedAt.toISOString().slice(0, 10);

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4">
        <Link href="/me" className="text-sm text-slate-500 hover:text-slate-900">
          ← 返回用户中心
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">设置通知渠道</h1>
      <MeSettingsClient
        initialChannel={initialChannel}
        initialChannelKey={user.channelKey}
        isFirstTime={isFirstTime}
        activatedAt={activatedAt}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { MeSettingsClient } from "./settings-client";

type Channel = "serverchan" | "bark" | "pushplus" | "telegram";

interface PageProps {
  searchParams: Promise<{ channel?: string }>;
}

function parseChannel(input: string | undefined): Channel {
  // 只接受合法值;非法值时回退到 user.channel(由调用方传入,这里只兜底)
  if (input === "serverchan" || input === "bark" || input === "pushplus" || input === "telegram") {
    return input;
  }
  return "serverchan";
}

export default async function MeSettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { channel: channelParam } = await searchParams;
  const isFirstTime = !user.channelKey;
  // 如果 URL 带 ?channel=X,优先用它(用于帮助页 deep-link);
  // 否则用 user.channel(老用户改渠道时保留上次选择)
  const initialChannel = channelParam
    ? parseChannel(channelParam)
    : parseChannel(user.channel);
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

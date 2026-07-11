import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { MeSettingsClient } from "./settings-client";
import { PushPreview } from "@/app/_components/push-preview";

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

      {/* 推送样例预览:让用户在保存渠道前就能看到自己将收到的内容。
          /me 已有同样的 preview,这里再加一份对称(用户主动查 settings 时也能看到)。 */}
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
        <PushPreview
          phoneNumber={user.sim.phoneNumber}
          days={Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(user.sim.lastPortedAt ?? user.sim.activatedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )}
          portToken={user.sim.portToken}
          simIdFallback={user.sim.id}
        />
      </details>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { PublicStats } from "@/app/_components/public-stats";

export const revalidate = 300;

/** 首页 feature card 用的 SVG 图标 — H1 修复,从 emoji 改为一致品牌 */
function HomeIcon({
  name,
  className = "text-indigo-600",
}: {
  name: "calendar" | "alert" | "bell";
  className?: string;
}) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      {/* Round 226: 转化优先首屏 — 先讲价值、给入口，再用真实推送样例降低理解成本。 */}
      <section
        aria-labelledby="home-title"
        className="mb-14 grid gap-8 lg:mb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center lg:gap-12"
      >
        <div className="max-w-xl">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-600" aria-hidden="true" />
            稳定守护您的英国号码
          </p>
          <h1
            id="home-title"
            className="mb-4 text-4xl font-bold tracking-[-0.035em] text-balance text-slate-950 sm:text-5xl sm:leading-[1.12]"
          >
            到期前，自动提醒您完成 Giffgaff 保号
          </h1>
          <p className="max-w-lg text-lg leading-8 text-pretty text-slate-600">
            录入号码和激活日期一次，系统会在第 170 天开始提醒；越接近 180 天截止日，提醒越及时。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-indigo-700 active:translate-y-px"
            >
              登录并管理号码
            </Link>
            <Link
              href="/redeem"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 shadow-sm transition-[background-color,border-color,color,transform] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:translate-y-px"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="mr-2"
              >
                <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
                <path d="M13 5v14" strokeDasharray="2 2" />
              </svg>
              使用卡密开通
            </Link>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            已有账号可直接登录；卡密用于首次开通服务。
          </p>

          {/* 慢统计放到主操作之后，数据库冷启动不再把按钮推离首屏。 */}
          <Suspense fallback={null}>
            <PublicStats />
          </Suspense>
        </div>

        {/* Round 225 push preview 融入首屏，不再把主要操作下推。 */}
        <section aria-labelledby="push-preview-title" className="lg:pl-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-indigo-600">推送预览</p>
                <h2 id="push-preview-title" className="mt-1 font-semibold text-slate-900">
                  您会收到这样的提醒
                </h2>
              </div>
              <span className="text-xs text-slate-400">刚刚</span>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <HomeIcon name="bell" className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-semibold text-slate-900">Giffgaff 保号提醒</p>
                    <p className="text-xs text-slate-400">Sever酱</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">号码尾号 5611 · 已激活 175 天</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3.5 ring-1 ring-inset ring-slate-200/80">
                <p className="text-sm leading-6 text-slate-700">
                  您的号码 ****5611 已进入保号窗口，请尽快完成一次付费活动。
                </p>
                <span className="mt-2 block break-all text-sm font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-4">
                  baohao.681218.xyz/p/abc123
                </span>
              </div>

              <ol className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-center text-xs text-slate-500" aria-label="收到提醒后的操作步骤">
                <li>打开链接</li>
                <li className="px-1 text-slate-300" aria-hidden="true">→</li>
                <li>更新日期</li>
                <li className="px-1 text-slate-300" aria-hidden="true">→</li>
                <li>重新计时</li>
              </ol>
            </div>

            <p className="border-t border-slate-100 px-4 py-3 text-center text-xs leading-5 text-slate-500 sm:px-5">
              支持 Sever酱、Bark、Telegram 与 pushplus
            </p>
          </div>
        </section>
      </section>

      <section aria-labelledby="service-highlights-title" className="mb-12 sm:mb-14">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-indigo-600">简单设置，自动运行</p>
            <h2 id="service-highlights-title" className="text-2xl font-bold tracking-tight text-slate-900">
              保号提醒如何工作
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500 sm:text-right">
            系统只负责在正确的时间提醒您，不会代替您执行付费活动。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <HomeIcon name="calendar" />
            <h3 className="mt-4 font-semibold text-slate-900">从激活第 170 天起</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">系统自动开始提醒您保号</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <HomeIcon name="alert" />
            <h3 className="mt-4 font-semibold text-slate-900">越临近越频繁</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">第 178 天 3 次 / 179 天 5 次 / 180 天 10 次</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <HomeIcon name="bell" />
            <h3 className="mt-4 font-semibold text-slate-900">Sever酱 / Bark 推送</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">绑定一次，之后自动提醒</p>
          </div>
        </div>
      </section>

      {/* Round 219: 提醒频率时间线 — 让用户一眼看出"170 天后才会推"的等待感 */}
      <section className="mb-14 sm:mb-16">
        <h2 className="mb-2 text-center text-2xl font-bold tracking-tight text-slate-900">170 天后，提醒自动开始</h2>
        <p className="mb-5 text-center text-sm text-slate-500">越临近 180 天截止日，提醒越频繁</p>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {/* 时间轴:从 170 到 180 */}
          <div className="relative pt-6 pb-2">
            {/* 横向轴 */}
            <div className="absolute top-9 left-0 right-0 h-0.5 bg-slate-200" aria-hidden="true" />
            <ol className="relative grid grid-cols-5 gap-1" aria-label="保号提醒频率时间线">
              {[
                { day: 170, count: 1, label: "1 次/天", tone: "slate" },
                { day: 175, count: 2, label: "2 次/天", tone: "amber" },
                { day: 178, count: 3, label: "3 次/天", tone: "orange" },
                { day: 179, count: 5, label: "5 次/天", tone: "red" },
                { day: 180, count: 10, label: "10 次/天", tone: "rose" },
              ].map((step) => {
                const colorMap: Record<string, { bg: string; ring: string; text: string }> = {
                  slate: { bg: "bg-slate-400", ring: "ring-slate-200", text: "text-slate-700" },
                  amber: { bg: "bg-amber-500", ring: "ring-amber-200", text: "text-amber-700" },
                  orange: { bg: "bg-orange-500", ring: "ring-orange-200", text: "text-orange-700" },
                  red: { bg: "bg-red-500", ring: "ring-red-200", text: "text-red-700" },
                  rose: { bg: "bg-rose-600", ring: "ring-rose-200", text: "text-rose-700" },
                };
                const c = colorMap[step.tone];
                return (
                  <li key={step.day} className="flex flex-col items-center">
                    <div
                      className={`w-5 h-5 rounded-full ${c.bg} ring-4 ring-white shadow-sm z-10 relative`}
                      aria-hidden="true"
                    />
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-semibold ${c.text}`}>
                        第 {step.day} 天
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{step.label}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            过了 180 天系统停止提醒，SIM 卡可能被运营商回收
          </p>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl space-y-3">
        <div className="mb-5 text-center">
          <p className="mb-1 text-sm font-medium text-indigo-600">开始前了解清楚</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">常见问题</h2>
        </div>
        <Faq
          defaultOpen
          q="Giffgaff 卡为什么要保号？"
          a="Giffgaff SIM 卡如果长期不活跃(不发起通话/短信/上网),运营商会在 6 个月后回收号码。保号就是通过任何付费活动(发短信、打电话)让卡保持活跃。"
        />
        <Faq
          defaultOpen
          q="保号提醒是怎么触发的？"
          a="从您的卡激活日起算,第 170 天系统开始给您发提醒。随着临近 180 天截止日,提醒频率自动增加。180 天当天会推 10 次,之后停止。"
        />
        <Faq
          q="推送渠道怎么选？"
          a="Sever酱(微信公众号)免费好用,适合大多数用户。Bark 适合 iOS 用户。Telegram Bot 适合能用 Telegram 的同学,免关注公众号、跨平台、即时送达。pushplus 现在实名要收费,新用户不建议(已付费实名的老用户仍可继续用)。任意选一个就行,登录后可以在「设置」里改。"
        />
        <Faq
          q="账号忘了 / 想换推送渠道？"
          a="重新登录一次就行,登录时会更新您的渠道信息。原账号自动作废,新登录会覆盖。"
        />
        <Faq
          q="我能在公众号/Bark 看到什么内容？"
          a="推送里会带一个链接,点进去就是保号时间更新页。选您最近一次保号的日期提交（不早于激活日期,不晚于今天）,系统就从那天重新计时 170 天。老用户（卡已用很久）可以补录很久以前的保号日期。"
        />
        <Faq
          q="卡密是什么 / 怎么用?"
          a="16 位字母数字的销售凭证。在兑换页填卡密 + 您的 Giffgaff SIM 卡号 + 激活日期即可绑定。一次性使用,详细步骤见登录页。"
        />
      </section>
    </div>
  );
}

function Faq({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  return (
    <details
      className="bg-white rounded-lg border border-slate-200 group"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-4 py-3 font-medium text-slate-900 list-none flex items-center justify-between">
        <span>{q}</span>
        <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
      </summary>
      <div className="px-4 pb-3 text-slate-600 text-sm leading-relaxed">{a}</div>
    </details>
  );
}

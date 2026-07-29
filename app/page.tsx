import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowSquareOut,
  Bell,
  CaretDown,
  ClockCountdown,
  Circle,
  CreditCard,
  PhoneTransfer,
  SealCheck,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  UserCircle,
  WifiHigh,
} from "@phosphor-icons/react/ssr";
import { PublicStats } from "@/app/_components/public-stats";

export const revalidate = 300;

const reminderSteps = [
  { marker: "开始日", label: "基础提醒", frequency: "1 次/天", color: "text-slate-500" },
  { marker: "剩 7 天", label: "增强提醒", frequency: "2 次/天", color: "text-amber-500" },
  { marker: "剩 4 天", label: "高频提醒", frequency: "3 次/天", color: "text-orange-500" },
  { marker: "剩 1 天", label: "关键提醒", frequency: "5 次/天", color: "text-orange-600" },
  { marker: "截止日", label: "最后提醒", frequency: "10 次/天", color: "text-red-600" },
];

const faqItems = [
  {
    q: "哪些 SIM 卡可以使用？",
    a: "目前提供 Giffgaff 与 CTExcel 两套快捷预设，也支持按每个号码自由填写提醒开始日和截止日，因此其他需要周期提醒的号码也可以按自定义规则管理。",
  },
  {
    q: "提醒日期是固定的吗？",
    a: "不是。Giffgaff 默认第 170 天开始、第 180 天截止；CTExcel 默认第 80 天开始、第 90 天截止。选择预设后仍可单独调整，后续也能随时切换运营商或修改规则。",
  },
  {
    q: "推送渠道怎么选？",
    a: "Sever酱适合微信用户，Bark 适合 iOS，Telegram Bot 适合跨平台使用，也可选择 pushplus。每个号码可以独立配置，登录后随时修改。",
  },
  {
    q: "号码很多时会不会收到太多消息？",
    a: "同一账号有 4 个及以上活跃号码时，系统会合并为账号提醒，并由最接近截止日的号码决定频率，避免逐个号码重复轰炸通知渠道。",
  },
  {
    q: "号码不用了，提醒权益怎么办？",
    a: "可以移除当前号码。账号、通知渠道和提醒名额会保留；有新号码时直接填写，原来的通知配置会自动沿用。",
  },
  {
    q: "卡密是什么 / 怎么用？",
    a: "卡密是 16 位字母数字销售凭证。在兑换页选择 Giffgaff 或 CTExcel，填写 SIM 卡号与激活日期即可开通，一次性使用。",
  },
];

export default function HomePage() {
  return (
    <div className="home-poster text-slate-950" data-design-direction="utility-poster">
      <section
        aria-labelledby="home-title"
        className="border-b border-slate-950/70"
      >
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:min-h-[490px] lg:grid-cols-[minmax(0,1.12fr)_minmax(500px,0.88fr)] lg:items-center lg:gap-16 lg:px-8 lg:py-8">
          <div>
            <p className="mb-4 text-sm font-bold tracking-[0.12em] text-indigo-700">
              多运营商预设 · 每个号码独立设置
            </p>
            <h1
              id="home-title"
              className="max-w-2xl text-[clamp(3.4rem,7vw,6.8rem)] font-black leading-[0.92] tracking-[-0.065em] text-balance"
            >
              每张 SIM，
              <span className="mt-2 block">按自己的时间提醒</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-pretty text-slate-800">
              选择运营商预设，或直接设置提醒开始日和截止日。系统按每张卡自己的规则计时，
              越接近截止日，提醒越密集。
            </p>
            <ul
              aria-label="可用提醒规则"
              className="mt-5 flex max-w-2xl flex-wrap gap-2 text-xs font-bold text-slate-700"
            >
              <li className="border border-slate-400/70 bg-white/55 px-3 py-2">
                Giffgaff · 170 → 180 天
              </li>
              <li className="border border-slate-400/70 bg-white/55 px-3 py-2">
                CTExcel · 80 → 90 天
              </li>
              <li className="border border-indigo-400/70 bg-indigo-50/70 px-3 py-2 text-indigo-800">
                自定义任意有效周期
              </li>
            </ul>

            <div className="mt-7 grid gap-3 sm:max-w-xl sm:grid-cols-2">
              <Link
                href="/login"
                className="inline-flex min-h-14 items-center justify-center gap-2 bg-indigo-700 px-5 py-3 font-bold text-white shadow-[0_10px_28px_-18px_rgba(67,56,202,0.9)] transition-[background-color,transform] hover:bg-indigo-800 active:translate-y-px"
              >
                <UserCircle size={21} weight="bold" aria-hidden="true" />
                登录并管理号码
              </Link>
              <Link
                href="/redeem"
                className="inline-flex min-h-14 items-center justify-center gap-2 border-2 border-indigo-700 bg-transparent px-5 py-3 font-bold text-indigo-800 transition-[background-color,color,transform] hover:bg-indigo-700 hover:text-white active:translate-y-px"
              >
                <Ticket size={21} weight="bold" aria-hidden="true" />
                使用卡密开通
              </Link>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              已有账号可直接登录；支持切换运营商、保留提醒名额与通知渠道。
            </p>
            <Suspense fallback={null}>
              <PublicStats />
            </Suspense>
          </div>

          <section aria-labelledby="push-preview-title" className="lg:pt-2">
            <p className="mb-3 inline-flex bg-indigo-700 px-3 py-1.5 text-sm font-bold tracking-[0.08em] text-white">
              录入一次，自动提醒
            </p>
            <div className="border border-slate-400/80 bg-white/55 p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.7)] backdrop-blur-[2px] sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-400/50 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-indigo-700 text-white">
                    <Bell size={25} weight="bold" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">SIM 保号提醒</p>
                    <p className="mt-0.5 text-sm text-slate-600">尾号 5611 · CTExcel · 距截止 5 天</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm text-slate-500">刚刚</span>
              </div>

              <div className="mt-4 bg-white/80 px-4 py-4 ring-1 ring-inset ring-slate-300/80 sm:px-5">
                <h2 id="push-preview-title" className="font-bold text-slate-950">
                  您会收到这样的提醒
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  您的号码 ****5611 已进入设置的提醒窗口，请尽快完成一次有效使用。
                </p>
                <span className="mt-2 block break-all text-sm font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-4">
                  baohao.681218.xyz/p/abc123
                </span>
              </div>

              <ol
                className="mt-4 grid grid-cols-3 divide-x divide-slate-300 text-center text-sm font-medium text-slate-700"
                aria-label="收到提醒后的操作步骤"
              >
                <li className="px-1">打开链接</li>
                <li className="px-1">更新日期</li>
                <li className="px-1">重新计时</li>
              </ol>
            </div>
            <p className="mt-3 text-center text-sm text-slate-600">
              运营商预设或自定义规则 · Sever酱、Bark、Telegram 与 pushplus
            </p>
          </section>
        </div>
      </section>

      <section aria-labelledby="reminder-timeline-title" className="border-b border-slate-950/20">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-4">
          <div className="border-b border-slate-950/70 pb-6 lg:border-r lg:border-b-0 lg:pr-8 lg:pb-0">
            <p className="text-sm font-black tracking-[0.12em] text-indigo-700">提醒节奏</p>
            <h2 id="reminder-timeline-title" className="mt-3 text-3xl font-black leading-tight tracking-tight">
              按截止日倒推，
              <span className="block">提醒逐步加密</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              开始日与截止日由每个号码自己决定，不再套用单一运营商周期。
            </p>
            <p className="mt-2 text-xs leading-5 text-indigo-700">
              选择预设只是起点，保存后仍可随时调整。
            </p>
          </div>

          <div className="min-w-0">
            <ol className="grid grid-cols-5" aria-label="保号提醒频率时间线">
              {reminderSteps.map((step) => (
                <li
                  key={step.marker}
                  aria-label={`${step.marker}，${step.frequency}`}
                  className="min-w-0 border-t border-slate-400 px-1 pt-4 text-center sm:px-2"
                >
                  <Circle
                    size={18}
                    weight="fill"
                    aria-hidden="true"
                    className={`mx-auto -mt-[25px] bg-[#f7f3ea] ${step.color}`}
                  />
                  <p className={`mt-3 text-sm font-black tracking-[-0.02em] sm:text-2xl ${step.color}`}>
                    {step.marker}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-800 sm:text-sm">{step.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{step.frequency}</p>
                </li>
              ))}
            </ol>
            <p className="mt-7 text-center text-xs leading-5 text-slate-500 sm:text-sm">
              到达自定义截止日后本轮自动停止；完成保号并更新日期即可重新计时
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="replacement-card-title"
        className="border-b border-slate-950/20 bg-slate-950 text-white"
      >
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center lg:px-8 lg:py-14">
          <div>
            <p className="inline-flex border border-emerald-300/40 bg-emerald-300/10 px-3 py-1.5 text-sm font-bold tracking-[0.08em] text-emerald-200">
              Giffgaff 停用后的下一步
            </p>
            <h2
              id="replacement-card-title"
              className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.045em] text-balance sm:text-6xl"
            >
              原卡封号后，
              <span className="block text-emerald-300">还有已激活替代方案</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              CTExcel 英国卡已提前完成激活并开通 Wi‑Fi Calling，首月含 50GB。
              介绍页同时整理了国内使用、80 / 90 天保号和 PAC 携号步骤。
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
              <li className="flex items-center gap-2 border-t border-slate-700 pt-3">
                <SealCheck size={20} weight="bold" className="shrink-0 text-emerald-300" aria-hidden="true" />
                到手已激活
              </li>
              <li className="flex items-center gap-2 border-t border-slate-700 pt-3">
                <WifiHigh size={20} weight="bold" className="shrink-0 text-emerald-300" aria-hidden="true" />
                Wi‑Fi Calling 已开通
              </li>
              <li className="flex items-center gap-2 border-t border-slate-700 pt-3">
                <PhoneTransfer size={20} weight="bold" className="shrink-0 text-emerald-300" aria-hidden="true" />
                PAC 携号说明
              </li>
            </ul>
            <a
              href="https://gg.681218.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-emerald-300 px-5 py-3 font-black text-slate-950 transition-colors hover:bg-emerald-200"
            >
              查看替代卡完整介绍
              <ArrowSquareOut size={20} weight="bold" aria-hidden="true" />
            </a>
          </div>

          <aside className="border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-label="CTExcel 替代卡摘要">
            <div className="flex items-start justify-between gap-4 border-b border-slate-700 pb-5">
              <div>
                <p className="text-sm font-bold text-emerald-300">CTExcel 已激活英国卡</p>
                <p className="mt-1 text-sm text-slate-400">首月 50GB · 中英共享流量</p>
              </div>
              <p className="text-right">
                <span className="block text-xs text-slate-400">到手价</span>
                <strong className="text-3xl font-black text-white">¥128</strong>
              </p>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-px bg-slate-700">
              <div className="bg-slate-900 p-4">
                <dt className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ClockCountdown size={16} aria-hidden="true" />
                  默认规则
                </dt>
                <dd className="mt-1 font-black text-white">80 → 90 天</dd>
              </div>
              <div className="bg-slate-900 p-4">
                <dt className="flex items-center gap-1.5 text-xs text-slate-400">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  到期之后
                </dt>
                <dd className="mt-1 font-black text-white">可自定义提醒</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-5 text-slate-400">
              套餐、设备支持与实时资费以替代卡介绍页和号码账户显示为准。
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:px-8 lg:pt-0 lg:pb-9">
        <section
          aria-labelledby="codex-membership-title"
          className="bg-indigo-700 p-5 text-white shadow-[0_24px_60px_-42px_rgba(49,46,129,0.9)] sm:p-6 lg:order-2"
        >
          <div className="grid gap-7 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
            <div>
              <p className="text-sm font-bold tracking-[0.08em] text-indigo-100">
                官方渠道订阅 · 本人信用卡代付 · 30 天质保
              </p>
              <h2
                id="codex-membership-title"
                className="mt-3 whitespace-nowrap text-[2rem] font-black leading-tight tracking-[-0.035em] sm:text-5xl"
              >
                Codex 会员代充
              </h2>
              <ul
                aria-label="会员订阅价格"
                className="mt-4 grid grid-cols-3 divide-x divide-white/25 border-y border-white/25"
              >
                {[
                  { name: "Plus", price: "¥130" },
                  { name: "5× Pro", price: "¥740" },
                  { name: "20× Pro", price: "¥1,200" },
                ].map((plan) => (
                  <li key={plan.name} className="py-2.5 text-center sm:py-3">
                    <span className="block text-[11px] font-bold text-indigo-100 sm:text-xs">
                      {plan.name}
                    </span>
                    <strong className="mt-0.5 block text-xl font-black tracking-tight text-white sm:text-2xl">
                      {plan.price}
                    </strong>
                  </li>
                ))}
              </ul>

              <ul className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="会员代充服务保障">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck size={25} weight="bold" aria-hidden="true" className="shrink-0 text-white" />
                  <div>
                    <p className="font-bold">官方渠道订阅</p>
                    <p className="mt-0.5 text-xs leading-5 text-indigo-100">通过官方订阅渠道购买</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CreditCard size={25} weight="bold" aria-hidden="true" className="shrink-0 text-white" />
                  <div>
                    <p className="font-bold">本人信用卡代付</p>
                    <p className="mt-0.5 text-xs leading-5 text-indigo-100">使用本人信用卡完成支付</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <SealCheck size={25} weight="bold" aria-hidden="true" className="shrink-0 text-white" />
                  <div>
                    <p className="font-bold">30 天质保</p>
                    <p className="mt-0.5 text-xs leading-5 text-indigo-100">订阅问题提供售后保障</p>
                  </div>
                </li>
              </ul>
            </div>

            <figure className="mx-auto w-full max-w-[220px] sm:max-w-[190px]">
              <div className="bg-white p-3">
                <Image
                  src="/images/codex-wechat-qr.png"
                  alt="微信二维码，用于咨询 Codex 会员代充"
                  width={660}
                  height={660}
                  sizes="(min-width: 640px) 190px, 220px"
                  className="block h-auto w-full"
                  loading="eager"
                  unoptimized
                />
              </div>
              <figcaption className="mt-2 text-center text-sm font-bold text-white">微信扫码咨询</figcaption>
            </figure>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="border-y border-slate-400/70 py-5 lg:order-1">
          <div className="border-b border-slate-400/60 pb-4">
            <p className="text-sm font-black tracking-[0.12em] text-indigo-700">开始前了解清楚</p>
            <h2 id="faq-title" className="mt-1 text-2xl font-black tracking-tight">常见问题</h2>
          </div>
          <div className="divide-y divide-slate-300/80">
            {faqItems.map((item, index) => (
              <Faq key={item.q} q={item.q} a={item.a} defaultOpen={index === 0} />
            ))}
          </div>
        </section>
      </section>

      <p className="mx-auto max-w-[1440px] px-4 pb-10 text-xs leading-5 text-slate-500 sm:px-6 lg:px-8">
        本服务提供运营商预设与自定义日期提醒，不替代运营商服务或实际有效使用。
      </p>
    </div>
  );
}

function Faq({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  return (
    <details className="group py-3" open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold text-slate-950">
        <span>{q}</span>
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden="true"
          className="details-chevron shrink-0 text-slate-500"
        />
      </summary>
      <p className="pb-1 pr-6 text-sm leading-6 text-slate-600">{a}</p>
    </details>
  );
}

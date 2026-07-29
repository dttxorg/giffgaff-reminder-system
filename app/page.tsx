import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  Bell,
  CaretDown,
  Circle,
  CreditCard,
  SealCheck,
  ShieldCheck,
  Ticket,
  UserCircle,
} from "@phosphor-icons/react/ssr";
import { PublicStats } from "@/app/_components/public-stats";

export const revalidate = 300;

const reminderSteps = [
  { day: 170, label: "开始提醒", frequency: "1 次/天", color: "text-slate-400" },
  { day: 175, label: "增强提醒", frequency: "2 次/天", color: "text-amber-500" },
  { day: 178, label: "高频提醒", frequency: "3 次/天", color: "text-orange-500" },
  { day: 179, label: "关键提醒", frequency: "5 次/天", color: "text-orange-600" },
  { day: 180, label: "最后提醒", frequency: "10 次/天", color: "text-red-600" },
];

const faqItems = [
  {
    q: "Giffgaff 卡为什么要保号？",
    a: "Giffgaff SIM 卡如果长期不活跃（不发起通话、短信或上网），运营商会在 6 个月后回收号码。保号就是通过一次付费活动让卡保持活跃。",
  },
  {
    q: "Giffgaff 和 CTExcel 的提醒周期一样吗？",
    a: "默认不一样：Giffgaff 第 170 天开始提醒、第 180 天截止；CTExcel 第 80 天开始提醒、第 90 天截止。登录后也可以为每个号码自由调整提醒开始日和截止日。",
  },
  {
    q: "推送渠道怎么选？",
    a: "Sever酱适合大多数微信用户，Bark 适合 iOS 用户，Telegram Bot 适合跨平台使用；登录后可以随时修改。",
  },
  {
    q: "账号忘了 / 想换推送渠道？",
    a: "重新登录一次即可，登录时会更新您的渠道信息。原账号自动作废，新登录会覆盖旧设置。",
  },
  {
    q: "我能在公众号 / Bark 看到什么？",
    a: "推送会带一个保号时间更新链接。提交最近一次保号日期后，系统会从那天按该号码当前设置的周期重新计时。",
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
              稳定守护您的英国号码
            </p>
            <h1
              id="home-title"
              className="max-w-2xl text-[clamp(3.4rem,7vw,6.8rem)] font-black leading-[0.92] tracking-[-0.065em] text-balance"
            >
              到期前，
              <span className="mt-2 block">自动提醒</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-pretty text-slate-800">
              录入 Giffgaff 或 CTExcel 号码一次，系统会载入
              <strong className="mx-1 font-black text-orange-600">170 / 180 天</strong>
              或
              <strong className="mx-1 font-black text-orange-600">80 / 90 天</strong>
              默认规则，也支持每个号码自由调整。
            </p>

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
                    <p className="font-bold text-slate-950">Giffgaff 保号提醒</p>
                    <p className="mt-0.5 text-sm text-slate-600">号码尾号 5611 · 已激活 175 天</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm text-slate-500">刚刚</span>
              </div>

              <div className="mt-4 bg-white/80 px-4 py-4 ring-1 ring-inset ring-slate-300/80 sm:px-5">
                <h2 id="push-preview-title" className="font-bold text-slate-950">
                  您会收到这样的提醒
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  您的号码 ****5611 已进入保号窗口，请尽快完成一次付费活动。
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
              支持 Giffgaff / CTExcel · Sever酱、Bark、Telegram 与 pushplus
            </p>
          </section>
        </div>
      </section>

      <section aria-labelledby="reminder-timeline-title" className="border-b border-slate-950/20">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-4">
          <div className="border-b border-slate-950/70 pb-6 lg:border-r lg:border-b-0 lg:pr-8 lg:pb-0">
            <p className="text-sm font-black tracking-[0.12em] text-indigo-700">提醒节奏</p>
            <h2 id="reminder-timeline-title" className="mt-3 text-3xl font-black leading-tight tracking-tight">
              170 天后，
              <span className="block">提醒自动开始</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">越临近 180 天截止日，提醒越频繁。</p>
            <p className="mt-2 text-xs leading-5 text-indigo-700">
              CTExcel 默认 80 / 90 天；两种预设均可按号码自定义。
            </p>
          </div>

          <div className="min-w-0">
            <ol className="grid grid-cols-5" aria-label="保号提醒频率时间线">
              {reminderSteps.map((step) => (
                <li
                  key={step.day}
                  aria-label={`第 ${step.day} 天，${step.frequency}`}
                  className="min-w-0 border-t border-slate-400 px-1 pt-4 text-center sm:px-2"
                >
                  <Circle
                    size={18}
                    weight="fill"
                    aria-hidden="true"
                    className={`mx-auto -mt-[25px] bg-[#f7f3ea] ${step.color}`}
                  />
                  <p className={`mt-3 text-2xl font-black tracking-[-0.04em] sm:text-4xl ${step.color}`}>
                    {step.day}
                    <span className="ml-1 text-xs tracking-normal text-slate-700 sm:text-sm">天</span>
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-800 sm:text-sm">{step.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{step.frequency}</p>
                </li>
              ))}
            </ol>
            <p className="mt-7 text-center text-xs leading-5 text-slate-500 sm:text-sm">
              过了 180 天系统停止提醒，SIM 卡可能被运营商回收
            </p>
          </div>
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
        本服务用于提醒您保持 Giffgaff 或 CTExcel 号码活跃，不替代运营商服务或实际付费活动。
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

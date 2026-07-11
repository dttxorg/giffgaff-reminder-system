import Link from "next/link";
import { ExternalLink } from "@/app/_components/external-link";

interface ChannelInfo {
  id: string;
  name: string;
  target: string;
  difficulty: "极易" | "简单" | "中等";
  requires: string;
  freeQuota: string;
  bestFor: string;
  href: string;
}

const CHANNELS: ChannelInfo[] = [
  {
    id: "bark",
    name: "Bark",
    target: "iOS / Android 推送 App",
    difficulty: "极易",
    requires: "iPhone 或 Android + 装一个 App",
    freeQuota: "无限制(走您自己的 Bark 服务器或官方)",
    bestFor: "iOS 用户首选;Android 也支持",
    href: "/help/bark",
  },
  {
    id: "serverchan",
    name: "Sever酱",
    target: "微信公众号",
    difficulty: "简单",
    requires: "微信号 + 微信扫码登录",
    freeQuota: "每天 5 条(本系统最多 20 条,够用)",
    bestFor: "不想装 App、习惯微信收消息",
    href: "/help/serverchan",
  },
  {
    id: "pushplus",
    name: "pushplus",
    target: "微信公众号",
    difficulty: "简单",
    requires: "微信号 + 微信扫码登录",
    freeQuota: "每天 200 条(完全够用)",
    bestFor: "Sever酱 额度的备选,推送更稳",
    href: "/help/pushplus",
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    target: "Telegram 消息",
    difficulty: "中等",
    requires: "能科学上网 + 创建一个 Bot",
    freeQuota: "无限制",
    bestFor: "海外用户 / 已有 TG 习惯",
    href: "/help/telegram",
  },
];

export default function HelpIndexPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <div className="mb-4">
        <Link href="/me" className="text-xs text-slate-500 hover:text-slate-900">
          ← 返回用户中心
        </Link>
      </div>
      <h1>选择推送渠道</h1>
      <p>
        本系统通过第三方推送服务把提醒发到您的设备。<strong>您只需要选一个最方便的渠道</strong>。
        下方是四个渠道的对比,选好后点链接看开通教程。
      </p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium">渠道</th>
              <th className="text-left px-3 py-2 font-medium">推到哪</th>
              <th className="text-left px-3 py-2 font-medium">难度</th>
              <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">需要</th>
              <th className="text-left px-3 py-2 font-medium hidden md:table-cell">免费额度</th>
              <th className="text-left px-3 py-2 font-medium">适合</th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={c.href}
                    className="text-indigo-600 hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-700">{c.target}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      c.difficulty === "极易"
                        ? "bg-emerald-100 text-emerald-800"
                        : c.difficulty === "简单"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {c.difficulty}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700 hidden sm:table-cell text-xs">
                  {c.requires}
                </td>
                <td className="px-3 py-2 text-slate-700 hidden md:table-cell text-xs">
                  {c.freeQuota}
                </td>
                <td className="px-3 py-2 text-slate-700 text-xs">{c.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="not-prose my-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="font-semibold text-slate-900 mb-2 inline-flex items-center gap-1.5">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-amber-500"
          >
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
          </svg>
          选哪个?
        </div>
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside">
          <li>
            <strong>iPhone 用户</strong>:推荐 <Link href="/help/bark" className="text-indigo-600 hover:underline">Bark</Link>,
            装好 App 复制 URL 就完事。
          </li>
          <li>
            <strong>不想装 App</strong>:推荐 <Link href="/help/serverchan" className="text-indigo-600 hover:underline">Sever酱</Link>,
            微信直接收。每天 5 条够保号提醒用(180 天最多 20 条)。
          </li>
          <li>
            <strong>想用更稳的微信推送</strong>:选 <Link href="/help/pushplus" className="text-indigo-600 hover:underline">pushplus</Link>,额度大。
          </li>
          <li>
            <strong>海外 / TG 重度用户</strong>:选 <Link href="/help/telegram" className="text-indigo-600 hover:underline">Telegram Bot</Link>。
          </li>
        </ul>
      </div>

      <h2>数据流 / 隐私</h2>
      <p className="text-sm text-slate-700">
        本系统发提醒时,会把以下信息发给<strong>您选定的推送服务商</strong>:
      </p>
      <ul className="text-sm text-slate-700">
        <li>您的<strong>手机号(后 6 位)</strong>用于标识是哪个 sim(不传完整号)</li>
        <li>推送<strong>正文</strong>(&quot;还有 X 天到期&quot;之类)</li>
        <li>推送<strong>时间</strong>(推送服务商自带的 metadata)</li>
      </ul>
      <p className="text-sm text-slate-700">
        <strong>不会</strong>发送您的激活日期、保号历史、sim 完整号、IMEI 等敏感信息。
        完整数据流详见各渠道教程页的 &quot;数据流 / 隐私&quot; 小节。
      </p>

      <h2>常见问题</h2>

      <details>
        <summary>能同时用多个渠道吗?</summary>
        <p>
          当前版本一个账号绑定一个渠道。如果您有特殊需求(比如同时想微信 + Bark 兜底),
          可以在 <Link href="/me" className="text-indigo-600 hover:underline">用户中心</Link> 切换渠道,
          历史推送会保留,只是后续新提醒走新渠道。
        </p>
      </details>

      <details>
        <summary>渠道选错了能换吗?</summary>
        <p>
          可以。登录后去 <Link href="/me/settings" className="text-indigo-600 hover:underline">/me/settings</Link>,
          重新选个渠道、填新信息、测试推送成功即可。旧渠道的 SendKey 会被覆盖。
        </p>
      </details>

      <details>
        <summary>收不到推送怎么办?</summary>
        <p>
          先去 <Link href="/me/settings" className="text-indigo-600 hover:underline">/me/settings</Link> 点 &quot;测试推送&quot;。
          如果测试都失败,99% 是渠道配置问题(URL 复制错了、SendKey 失效等),对照教程页的 FAQ 排查。
        </p>
      </details>

      <div className="not-prose mt-8 flex gap-3 flex-wrap">
        <Link
          href="/me"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          返回用户中心
        </Link>
        <ExternalLink
          href="https://github.com/zhuli/gg-reminder"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          项目主页
        </ExternalLink>
      </div>
    </article>
  );
}

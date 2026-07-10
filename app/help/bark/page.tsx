import Link from "next/link";
import { ExternalLink } from "@/app/_components/external-link";

const BARK_APP_STORE_URL = "https://apps.apple.com/cn/app/bark-%E7%BB%99%E4%BD%A0%E7%9A%84%E6%89%8B%E6%9C%BA%E5%8F%91%E6%8E%A8%E9%80%81/id1403753865";
const BARK_GITHUB_URL = "https://github.com/finb/bark";

export default function BarkHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <div className="mb-4">
        <Link href="/me" className="text-xs text-slate-500 hover:text-slate-900">
          ← 返回用户中心
        </Link>
      </div>
      <h1>Bark 开通教程</h1>
      <p>
        Bark 是一个 <strong>iOS</strong> 推送 App,直接推送到您的 iPhone / iPad。
        <br />
        <span className="text-slate-500 text-sm">
          无需注册账号,无需关注公众号,装上 App 就能用。大约 1 分钟搞定。
        </span>
      </p>

      <div className="not-prose my-6 flex flex-wrap gap-3">
        <ExternalLink href={BARK_APP_STORE_URL} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-sm">
          🍎 iOS - 跳转 App Store 下载
        </ExternalLink>
      </div>

      <div className="not-prose my-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <strong>📱 不是 iPhone / iPad?</strong>
        <p className="mt-1">
          Bark <strong>仅支持 iOS / macOS</strong>(App Store 官方下载)。如果您的设备是 Android / Windows / 其他,
          推荐用 <strong>Sever酱</strong>(免费)或 <strong>Telegram Bot</strong>(免费,需能访问 Telegram)。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/help/serverchan" className="underline">Sever酱 →</Link>
          <span className="text-amber-700">·</span>
          <Link href="/help/telegram" className="underline">Telegram Bot →</Link>
        </div>
      </div>

      <h2>步骤详解</h2>

      <ol>
        <li>
          <strong>下载 Bark</strong>
          <p>
            点击上方&quot;跳转 App Store 下载&quot;按钮,或直接在 App Store 搜索 <code>Bark</code> 下载。
          </p>
        </li>

        <li>
          <strong>打开 App,首页会显示一个 Bark URL</strong>
          <p>
            形如 <code>https://api.day.app/abc123xyz</code>(末尾的随机字符串就是您的 key)。
            <br />
            <span className="text-slate-500 text-sm">
              如果 URL 显示不同,只要是 <code>https://</code> 开头,以一串字符结尾,就是对的。
            </span>
          </p>
        </li>

        <li>
          <strong>复制 App 里显示的完整 URL</strong>
          <p>
            点 URL 旁边的&quot;复制&quot;按钮(通常是个剪贴板图标),或长按 URL 选&quot;复制&quot;。
          </p>
        </li>

        <li>
          <strong>回到本系统,设置通知渠道</strong>
          <p>
            登录本系统(填手机号即可)→ 进入 <strong>用户中心</strong> →
            顶部红色横幅点&quot;立即设置&quot;→ 选择 <strong>Bark</strong> →
            把刚才复制的 URL 粘贴到输入框 → 点 <strong>测试推送</strong>。
          </p>
          <p>Bark App 应立即收到一条&quot;测试消息&quot;,说明配置成功。点&quot;保存&quot;完成。</p>
        </li>
      </ol>

      <h2>常见问题</h2>

      <details>
        <summary>Bark URL 在哪里找?</summary>
        <p>
          打开 Bark App,<strong>首页第一行</strong>就是您的 Bark URL。如果首页不是 URL,点底部&quot;设置&quot;标签。
        </p>
        <p className="text-slate-500 text-sm">
          URL 示例:<br />
          • <code>https://api.day.app/abc123xyz</code> (官方服务器,推荐)<br />
          • <code>https://bark.your-server.com/your-key</code> (自建服务器)
        </p>
      </details>

      <details>
        <summary>iOS 收不到推送?</summary>
        <ul>
          <li><strong>必须打开 App 一次</strong>(苹果限制,新装的推送 App 不打开不工作)</li>
          <li>检查 iPhone 设置 → 通知 → Bark → 允许通知 ✅</li>
          <li>检查 Bark App 内&quot;测试推送&quot;是否能正常发出</li>
        </ul>
      </details>

      <details>
        <summary>Android 收不到推送?</summary>
        <ul>
          <li>检查手机设置 → 应用 → Bark → 通知 → 允许通知 ✅</li>
          <li>某些定制系统需要额外设置&quot;自启动&quot;和&quot;后台运行&quot;</li>
          <li>检查 Bark App 内&quot;测试推送&quot;是否能正常发出</li>
        </ul>
      </details>

      <details>
        <summary>可以自建服务器吗?</summary>
        <p>
          可以。如果官方 <code>api.day.app</code> 不稳定,可以自己部署 Bark Server,推送更可靠。
          <br />
          详见 <ExternalLink href={BARK_GITHUB_URL} className="">finb/bark GitHub</ExternalLink>。
        </p>
        <p>自建后,把 URL 换成您自己服务器地址即可,无需改其他步骤。</p>
      </details>

      {/* 完成检查清单 — 与 Sever酱/Pushplus 教程对齐 */}
      <div className="not-prose mt-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="font-semibold text-slate-900 mb-2">✅ 完成检查清单</div>
        <ul className="text-sm text-slate-700 space-y-1">
          <li>☐ App Store 已下载并打开 Bark</li>
          <li>☐ 已复制 App 首页显示的 Bark URL(以 <code className="bg-white px-1 rounded">https://</code> 开头)</li>
          <li>☐ 已在 <Link href="/me/settings?channel=bark" className="text-indigo-600 hover:underline">/me/settings?channel=bark</Link> 选 Bark、粘贴 URL、测试推送成功</li>
          <li>☐ Bark App 已收到测试消息</li>
        </ul>
        <div className="mt-3 text-xs text-slate-500">
          全打勾 = 配置完成。后续 170 天开始会自动推提醒,不用再做任何操作。
        </div>
      </div>

      <div className="not-prose mt-6 flex gap-3 flex-wrap">
        <Link
          href="/me/settings?channel=bark"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          去设置通知渠道
        </Link>
        <Link
          href="/help/serverchan"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          查看 Sever酱 教程
        </Link>
        <Link
          href="/help/telegram"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          查看 Telegram 教程
        </Link>
      </div>
    </article>
  );
}

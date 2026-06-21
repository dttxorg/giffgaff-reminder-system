import Link from "next/link";

const BARK_APP_STORE_URL = "https://apps.apple.com/cn/app/bark-%E7%8B%97%E5%AD%90%E6%9C%BA%E5%99%A8%E4%BA%BA/id1403753865";
const BARK_APP_STORE_EN_URL = "https://apps.apple.com/us/app/bark-custom-notifications/id1403753865";
const BARK_GITHUB_URL = "https://github.com/finb/bark";
const BARK_GITHUB_RELEASES_URL = "https://github.com/finb/bark/releases";

export default function BarkHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <h1>Bark 开通教程</h1>
      <p>
        Bark 是一个 <strong>iOS</strong> 推送 App,直接推送到您的 iPhone / iPad。
        <br />
        <span className="text-slate-500 text-sm">
          无需注册账号,无需关注公众号,装上 App 就能用。大约 1 分钟搞定。
        </span>
      </p>

      <div className="not-prose my-6 flex flex-wrap gap-3">
        <a
          href={BARK_APP_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          🍎 iOS - 跳转 App Store 下载(推荐)
        </a>
      </div>

      <div className="not-prose my-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <strong>📱 没有 iPhone / iPad?</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            <strong>Android</strong>:Bark 在 Google Play 上<strong>没有官方版本</strong>,
            开发者只在 <a href={BARK_GITHUB_RELEASES_URL} target="_blank" rel="noreferrer" className="underline">GitHub Releases</a> 发布 APK。
            <br />
            <span className="text-amber-800">
              装 APK 需要在手机"设置 → 安全"里允许"安装未知来源应用"。
            </span>
          </li>
          <li>
            <strong>推荐改用 Sever酱</strong>:
            微信里就能用,不需要装 App。<Link href="/help/serverchan" className="underline">查看 Sever酱 教程 →</Link>
          </li>
        </ul>
      </div>

      <h2>步骤详解</h2>

      <ol>
        <li>
          <strong>下载 Bark</strong>
          <p>
            <strong>iOS 用户</strong>:点击上方"跳转 App Store 下载"按钮,或直接在 App Store 搜索 <code>Bark</code> 下载。
            <br />
            认准开发者: <strong>Finb</strong>(图标是个狗头)。免费,无内购。
          </p>
          <p>
            <strong>Android 用户</strong>:
            打开 <a href={BARK_GITHUB_RELEASES_URL} target="_blank" rel="noreferrer">GitHub Releases 页面</a>,
            下载最新版本的 <code>app-release.apk</code> 文件,在手机上安装。
            <br />
            <span className="text-amber-700 text-sm">
              ⚠️ Android 用户建议直接改用 Sever酱(微信公众号),省事。
              <Link href="/help/serverchan" className="underline ml-1">教程</Link>
            </span>
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
            点 URL 旁边的"复制"按钮(通常是个剪贴板图标),或长按 URL 选"复制"。
          </p>
        </li>

        <li>
          <strong>回到本系统,设置通知渠道</strong>
          <p>
            登录本系统(填手机号即可)→ 进入 <strong>用户中心</strong> →
            顶部红色横幅点"立即设置"→ 选择 <strong>Bark</strong> →
            把刚才复制的 URL 粘贴到输入框 → 点 <strong>测试推送</strong>。
          </p>
          <p>Bark App 应立即收到一条"测试消息",说明配置成功。点"保存"完成。</p>
        </li>
      </ol>

      <h2>常见问题</h2>

      <details>
        <summary>Bark URL 在哪里找?</summary>
        <p>
          打开 Bark App,<strong>首页第一行</strong>就是您的 Bark URL。如果首页不是 URL,点底部"设置"标签。
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
          <li>检查 Bark App 内"测试推送"是否能正常发出</li>
        </ul>
      </details>

      <details>
        <summary>Android 收不到推送?</summary>
        <ul>
          <li>检查手机设置 → 应用 → Bark → 通知 → 允许通知 ✅</li>
          <li>某些定制系统需要额外设置"自启动"和"后台运行"</li>
          <li>检查 Bark App 内"测试推送"是否能正常发出</li>
        </ul>
      </details>

      <details>
        <summary>可以自建服务器吗?</summary>
        <p>
          可以。如果官方 <code>api.day.app</code> 不稳定,可以自己部署 Bark Server,推送更可靠。
          <br />
          详见 <a href={BARK_GITHUB_URL} target="_blank" rel="noreferrer">finb/bark GitHub</a>。
        </p>
        <p>自建后,把 URL 换成您自己服务器地址即可,无需改其他步骤。</p>
      </details>

      <div className="not-prose mt-6 flex gap-3 flex-wrap">
        <Link
          href="/me/settings"
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
      </div>
    </article>
  );
}

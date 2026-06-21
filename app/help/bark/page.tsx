import Link from "next/link";

export default function BarkHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <h1>Bark 开通教程</h1>
      <p>
        Bark 是一个 iOS / Android 推送 App,直接推送到您的手机。无需注册账号,无需关注公众号。
      </p>

      <ol>
        <li>
          <strong>下载 Bark</strong>
          <p>
            iOS 用户:在 App Store 搜索&quot;Bark&quot;下载(开发者:Finb)
            <br />
            Android 用户:从 GitHub <a href="https://github.com/finb/bark" target="_blank" rel="noreferrer">finb/bark</a> 下载 APK 安装
          </p>
        </li>
        <li>
          <strong>打开 App,首页会显示一个 Bark URL</strong>
          <p>
            形如 <code>https://api.day.app/abc123xyz</code>(末尾的随机字符串就是您的 key)
          </p>
        </li>
        <li>
          <strong>复制 App 里显示的完整 URL</strong>
        </li>
        <li>
          <strong>回到本系统登录页</strong>
          <p>把 URL 粘贴到&quot;Bark URL&quot;输入框,选择&quot;Bark&quot;渠道</p>
        </li>
        <li>
          <strong>点击「发送验证码」测试</strong>
          <p>Bark 会立即推一条测试消息,说明配置成功</p>
        </li>
      </ol>

      <div className="not-prose mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <strong>提示</strong>: 如果您有自己的服务器,可以自建 Bark Server,推送更稳定。只需把 URL 换成您自己服务器地址即可。
      </div>

      <div className="not-prose mt-6 flex gap-3">
        <Link
          href="/login"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          去登录
        </Link>
        <Link
          href="/help/serverchan"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          查看 Sever酱 教程
        </Link>
      </div>
    </article>
  );
}

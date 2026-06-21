import Link from "next/link";

export default function ServerChanHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <h1>Sever酱 开通教程</h1>
      <p>
        Sever酱 是一个把消息推送到微信公众号的服务。开通后,本系统给您发提醒时,微信会立即收到一条消息。
      </p>

      <ol>
        <li>
          <strong>用微信扫码关注公众号「Server酱」</strong>
          <p>
            访问官网 <a href="https://sct.ftqq.com" target="_blank" rel="noreferrer">sct.ftqq.com</a> 扫码关注
            (也支持直接搜索微信公众号"Server酱")
          </p>
        </li>
        <li>
          <strong>登录后点击「SendKey」菜单</strong>
          <p>复制您的 SendKey(以 <code>SCT</code> 开头的字符串)</p>
        </li>
        <li>
          <strong>回到本系统登录页</strong>
          <p>把 SendKey 粘贴到"SendKey"输入框,选择"Sever酱"渠道</p>
        </li>
        <li>
          <strong>点击「发送验证码」测试</strong>
          <p>微信会立即收到一条测试消息,说明配置成功</p>
        </li>
      </ol>

      <div className="not-prose mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <strong>提示</strong>: Sever酱 免费版每天有推送次数限制,够个人使用。本系统的提醒规则在 180 天内最多 20 条,远低于限制。
      </div>

      <div className="not-prose mt-6 flex gap-3">
        <Link
          href="/login"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          去登录
        </Link>
        <Link
          href="/help/bark"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          查看 Bark 教程
        </Link>
      </div>
    </article>
  );
}

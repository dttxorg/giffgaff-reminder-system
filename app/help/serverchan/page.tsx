import Link from "next/link";

export default function ServerChanHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <h1>Sever酱 开通教程</h1>
      <p>
        Sever酱 是一个把消息推送到<strong>微信公众号</strong>的服务。开通后,本系统给您发提醒时,微信会立即收到一条消息。
        <br />
        <span className="text-slate-500 text-sm">
          大约 2 分钟搞定,需要您有一个微信号。
        </span>
      </p>

      <div className="not-prose my-6 flex flex-wrap gap-3">
        <a
          href="https://sct.ftqq.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          🔗 打开 Sever酱 官网
        </a>
        <a
          href="https://sct.ftqq.com/login"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          直接登录 (已有账号)
        </a>
      </div>

      <h2>步骤详解</h2>

      <ol>
        <li>
          <strong>用微信扫码关注公众号「Server酱」</strong>
          <p>
            在 Sever酱 官网首页(<a href="https://sct.ftqq.com" target="_blank" rel="noreferrer">sct.ftqq.com</a>)用微信扫码即可关注。
          </p>
          <p className="text-slate-600 text-sm">
            <strong>没有电脑?</strong> 也可以在手机上操作:
          </p>
          <ul className="text-sm">
            <li>打开微信 → 右上角 + 号 → <strong>添加朋友</strong></li>
            <li>选 <strong>公众号</strong> 标签</li>
            <li>搜索 <code>Server酱</code> 或 <code>方糖气球</code> (Server酱 的运营品牌)</li>
            <li>认准头像(蓝色方糖),点 <strong>关注</strong></li>
          </ul>
        </li>

        <li>
          <strong>登录 Sever酱 拿到 SendKey</strong>
          <p>
            访问 <a href="https://sct.ftqq.com/login" target="_blank" rel="noreferrer">sct.ftqq.com/login</a>,
            用刚关注的微信扫码登录。
          </p>
          <p>登录后页面会显示您的 <strong>SendKey</strong>(以 <code>SCT</code> 开头的一长串字符),点"复制"按钮复制。</p>
          <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm">
            <strong>注意</strong>:SendKey 相当于您的密码,不要发给任何人。复制后妥善保存。
          </p>
        </li>

        <li>
          <strong>回到本系统,设置通知渠道</strong>
          <p>
            登录本系统(填手机号即可)→ 进入 <strong>用户中心</strong> →
            顶部红色横幅点"立即设置"→ 选择 <strong>Sever酱</strong> →
            把 SendKey 粘贴到输入框 → 点 <strong>测试推送</strong>。
          </p>
          <p>微信应立即收到一条"测试消息",说明配置成功。点"保存"完成。</p>
        </li>
      </ol>

      <h2>常见问题</h2>

      <details>
        <summary>SendKey 在哪里找?</summary>
        <p>
          登录 <a href="https://sct.ftqq.com" target="_blank" rel="noreferrer">sct.ftqq.com</a> 后,
          首页就能看到您的 SendKey。如果没看到,点左上角菜单 → "SendKey"。
        </p>
      </details>

      <details>
        <summary>免费版有限制吗?</summary>
        <p>
          免费版每天 <strong>5 条</strong> 推送,够个人使用。本系统的提醒规则在 180 天内最多
          20 条,平均到 180 天 = 每 9 天 1 条,远低于限制。
        </p>
      </details>

      <details>
        <summary>测试推送收不到?</summary>
        <ul>
          <li>检查微信公众号 "Server酱" 是否已关注(没关注收不到)</li>
          <li>检查 SendKey 是否复制完整(以 <code>SCT</code> 开头)</li>
          <li>等 1-2 分钟,微信推送有延迟</li>
          <li>在 Sever酱 官网 "发送记录" 看是否真的发出</li>
        </ul>
      </details>

      <div className="not-prose mt-6 flex gap-3 flex-wrap">
        <Link
          href="/me/settings"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          去设置通知渠道
        </Link>
        <Link
          href="/help/bark"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          查看 Bark 教程
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

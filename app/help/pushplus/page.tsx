import Link from "next/link";

const PUSHPLUS_HOME = "https://www.pushplus.plus/";
const PUSHPLUS_LOGIN = "https://www.pushplus.plus/login.html";
const PUSHPLUS_PUSH1 = "https://www.pushplus.plus/push1.html";
const PUSHPLUS_DOC = "https://www.pushplus.plus/doc/";

export default function PushPlusHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <h1>pushplus 开通教程</h1>
      <p>
        pushplus(推送加)是一个<strong>微信公众号推送</strong>平台,从 2019 年上线至今稳定运营。
        <br />
        <span className="text-slate-500 text-sm">
          大约 3 分钟搞定。优点:长期维护、免费额度高、模板丰富,比 Sever酱 更稳定。
        </span>
      </p>

      <div className="not-prose my-6 flex flex-wrap gap-3">
        <a
          href={PUSHPLUS_HOME}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          🔗 打开 pushplus 官网
        </a>
        <a
          href={PUSHPLUS_LOGIN}
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
          <strong>注册 pushplus 账号</strong>
          <p>
            访问 <a href={PUSHPLUS_HOME} target="_blank" rel="noreferrer">pushplus.plus</a>,
            点右上角"登录" → 选"<strong>微信扫码登录</strong>"。
          </p>
          <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm">
            <strong>注意</strong>:首次使用会引导你<strong>关注微信公众号「pushplus 推送加」</strong>,
            推送的消息会通过这个公众号送达。<strong>必须关注</strong>才能收到推送。
          </p>
        </li>

        <li>
          <strong>完成实名认证 (必做)</strong>
          <p>
            从 2024-08-01 起,未实名的用户<strong>无法调用发送消息接口</strong>。
          </p>
          <p>
            在 pushplus 顶部菜单 → "个人中心" → "<strong>实名认证</strong>" → 填身份证号 + 姓名,几秒钟完成。
          </p>
          <p className="text-slate-500 text-sm">
            (实名是为了防止滥用,平台不会拿你的信息做其他用途)
          </p>
        </li>

        <li>
          <strong>拿到你的 pushplus token</strong>
          <p>
            登录后顶部菜单 → "<strong>个人中心</strong>" → "<strong>我的token</strong>"。
            复制你看到的 token(通常是一串字母数字混合的字符)。
          </p>
          <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm">
            <strong>注意</strong>:token 相当于密码,不要发给别人。复制后妥善保存。
          </p>
        </li>

        <li>
          <strong>回到本系统,设置通知渠道</strong>
          <p>
            登录本系统(填手机号即可)→ 进入 <strong>用户中心</strong> →
            顶部红色横幅点"立即设置"→ 选择 <strong>pushplus</strong> →
            把 token 粘贴到输入框 → 点 <strong>测试推送</strong>。
          </p>
          <p>微信公众号"pushplus 推送加"应立即收到一条"测试消息",说明配置成功。点"保存"完成。</p>
        </li>
      </ol>

      <h2>常见问题</h2>

      <details>
        <summary>pushplus vs Sever酱,选哪个?</summary>
        <p>
          <strong>都好用</strong>,核心都是微信公众号推送。区别:
        </p>
        <ul>
          <li><strong>Sever酱</strong>:老牌,5 条/天免费,需要先关注"Server酱"公众号,受微信政策影响大</li>
          <li><strong>pushplus</strong>:长期维护,免费额度更高(每天 200 条),实名后可多设备转发,模板丰富</li>
        </ul>
        <p>
          客户用哪个都行。<strong>Android 用户</strong>推荐 pushplus(本系统已集成)。
        </p>
      </details>

      <details>
        <summary>token 在哪里找?</summary>
        <p>
          登录 <a href={PUSHPLUS_LOGIN} target="_blank" rel="noreferrer">pushplus.plus</a> 后,
          点右上角头像 → "<strong>个人中心</strong>" → "<strong>我的token</strong>"。
        </p>
        <p className="text-slate-500 text-sm">
          token 是一串字母数字,例如 <code>abcdef123456...</code>
        </p>
      </details>

      <details>
        <summary>免费版有限制吗?</summary>
        <p>
          免费用户<strong>每天 200 条推送</strong>,远超过本系统需求(每位用户 180 天最多 20 条)。
        </p>
        <p>
          如果你要推送给多人(用 pushplus 的"群组"功能),可能需要会员。
          <strong>个人用本系统</strong>,免费版足够。
        </p>
      </details>

      <details>
        <summary>测试推送收不到?</summary>
        <ul>
          <li>检查微信公众号"<strong>pushplus 推送加</strong>"是否已关注(没关注收不到)</li>
          <li>检查是否<strong>完成实名认证</strong>(2024-08-01 起必做)</li>
          <li>检查 token 是否复制完整(不要带空格、换行)</li>
          <li>在 pushplus 网站 → "<strong>历史消息</strong>" 看是否真的发出</li>
          <li>部分企业微信/钉钉环境可能拦截公众号消息,换一个网络环境试试</li>
        </ul>
      </details>

      <details>
        <summary>可以推到其他渠道吗(企业微信/钉钉/飞书)?</summary>
        <p>
          可以。pushplus 支持<strong>多渠道转发</strong>:微信公众号、企业微信、钉钉、飞书、邮件、Bark 等。
        </p>
        <p>
          默认本系统用微信公众号(channel=wechat),如果你要改企业微信等其他渠道,
          需要在 pushplus 后台配置 webhook,然后改 API 请求里的 channel 参数。
          这部分本系统暂未集成,如需要后续可加。
        </p>
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

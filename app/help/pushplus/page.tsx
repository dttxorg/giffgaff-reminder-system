import Link from "next/link";

const PUSHPLUS_HOME = "https://www.pushplus.plus/";
const PUSHPLUS_LOGIN = "https://www.pushplus.plus/login.html";
const PUSHPLUS_TOKEN_PAGE = "https://www.pushplus.plus/uc.html";

export default function PushPlusHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <h1>pushplus 开通教程</h1>
      <p>
        pushplus(推送加)是一个<strong>微信公众号推送</strong>平台,从 2019 年上线至今稳定运营。
        <br />
        <span className="text-slate-500 text-sm">
          老牌服务,模板丰富,支持多设备转发。但 2024-08 起要求实名才能用,且<strong>实名平台要收费</strong>。
        </span>
      </p>

      {/* 费用警告: 醒目提醒费用是 pushplus 收的 */}
      <div className="not-prose my-6 p-4 rounded-lg bg-rose-50 border-2 border-rose-300 text-rose-900">
        <div className="font-semibold mb-1 text-base">💰 重要:实名认证要付费</div>
        <div className="text-sm leading-relaxed space-y-1.5">
          <p>
            pushplus 从 <strong>2024-08-01</strong> 起要求<strong>实名认证</strong>后才能发消息,
            且<strong>实名认证平台要收费</strong>(由 pushplus 收取,<strong>本系统不收任何费用</strong>)。
          </p>
          <p>
            具体费用以 pushplus 网站为准(几元到几十元不等)。一旦付费后,
            后续使用推送功能是免费的(每天 200 条额度)。
          </p>
        </div>
      </div>

      {/* 如何选择: 决策提示 */}
      <div className="not-prose my-6 p-4 rounded-lg bg-blue-50 border border-blue-300">
        <div className="font-semibold text-blue-900 mb-2">🤔 怎么选?</div>
        <ul className="text-sm text-blue-900 space-y-1.5">
          <li>
            <strong>不想付任何钱</strong> → 选 <Link href="/help/serverchan" className="underline">Sever酱</Link>(免费,2 分钟搞定,本系统推荐)
          </li>
          <li>
            <strong>需要推送给多人(家庭/公司)</strong> → pushplus 群组功能适合,值得付费
          </li>
          <li>
            <strong>已经付费实名过</strong> → 继续用 pushplus,本系统支持不变
          </li>
          <li>
            <strong>iPhone 用户</strong> → 推荐 <Link href="/help/bark" className="underline">Bark</Link>(免费,1 分钟搞定)
          </li>
          <li>
            <strong>能用 Telegram</strong> → 推荐 <Link href="/help/telegram" className="underline">Telegram Bot</Link>(免费)
          </li>
        </ul>
      </div>

      {/* 快速通道: 已有账号直接拿 token */}
      <div className="not-prose my-6 p-4 rounded-lg bg-emerald-50 border border-emerald-300">
        <div className="font-semibold text-emerald-900 mb-1">⚡ 已经有 pushplus 账号 + token?</div>
        <div className="text-sm text-emerald-800 mb-3">
          登录后在「个人中心 → 我的token」复制 token,然后直接到第 4 步配置本系统。
        </div>
        <a
          href={PUSHPLUS_TOKEN_PAGE}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-sm"
        >
          🔑 直接拿 token
        </a>
      </div>

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
          <strong>用微信注册 pushplus 账号</strong>
          <p>
            打开 <a href={PUSHPLUS_HOME} target="_blank" rel="noreferrer">pushplus.plus</a>,
            点右上角"登录" → 选"<strong>微信扫码登录</strong>"。
          </p>
          <div className="not-prose mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <div className="font-semibold mb-1">⚠️ 必做:关注公众号</div>
            首次登录会弹窗引导你<strong>关注微信公众号「pushplus 推送加」</strong>。
            <strong>必须关注</strong>才能收到推送。点弹窗里的"关注"按钮即可。
          </div>
          <div className="not-prose mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <div className="font-semibold mb-1">✅ 做到这步你应该看到</div>
            微信通讯录里多了「pushplus 推送加」公众号,登录后跳转到 pushplus 控制台首页。
          </div>
        </li>

        <li>
          <strong>完成实名认证(必做,需付费)</strong>
          <p>
            未实名的用户<strong>无法调用发送消息接口</strong> — 配完本系统测试推送一定失败,所以这一步必做。
          </p>
          <p>操作路径:</p>
          <ol className="text-sm">
            <li>pushplus 顶部菜单 → "<strong>个人中心</strong>"</li>
            <li>左边栏 → "<strong>实名认证</strong>"</li>
            <li>填<strong>身份证号 + 姓名</strong>,几秒完成认证</li>
            <li>按页面提示完成<strong>付费</strong>(金额以 pushplus 页面为准,几元到几十元)</li>
          </ol>
          <div className="not-prose mt-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-sm">
            <div className="font-semibold mb-1">💰 费用说明</div>
            <ul className="text-sm space-y-1">
              <li>费用<strong>由 pushplus 平台收取</strong>,本系统不收任何费用</li>
              <li>具体金额以 pushplus 页面显示为准(不同时间/活动可能不同)</li>
              <li>付费后推送功能免费用(每天 200 条额度,本系统最多用 20 条)</li>
              <li>不想付费?回到本页顶部选 <Link href="/help/serverchan" className="underline">Sever酱</Link>(免费)</li>
            </ul>
          </div>
          <div className="not-prose mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <div className="font-semibold mb-1">✅ 做到这步你应该看到</div>
            「个人中心」页面上「实名状态」显示 <strong>已认证</strong>。
          </div>
        </li>

        <li>
          <strong>拿到你的 pushplus token</strong>
          <p>操作路径:</p>
          <ol className="text-sm">
            <li>pushplus 顶部菜单 → "<strong>个人中心</strong>"</li>
            <li>左边栏 → "<strong>我的token</strong>"</li>
            <li>点 token 旁边的"复制"按钮</li>
          </ol>
          <div className="not-prose mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
            <div className="font-semibold text-slate-900 mb-1">token 长这样:</div>
            <code className="text-slate-800 break-all">a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6</code>
            <div className="text-slate-600 mt-1 text-xs">
              一串字母数字混合,无空格无横线,长度 32 位左右。点"复制"按钮,不要手动选中。
            </div>
          </div>
          <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm mt-3">
            <strong>注意</strong>:token 相当于密码,不要发给别人。丢了可以随时回 pushplus 个人中心重新复制。
          </p>
        </li>

        <li>
          <strong>回到本系统,设置通知渠道</strong>
          <p>根据您当前的状态,路径略有不同:</p>
          <ul>
            <li>
              <strong>首次设置(用户中心顶部有红色横幅)</strong>:点横幅里的"立即设置" → 跳到 <code>/me/settings</code>
            </li>
            <li>
              <strong>已登录要改渠道</strong>:直接访问 <Link href="/me/settings?channel=pushplus">/me/settings?channel=pushplus</Link>
            </li>
          </ul>
          <p>
            选 <strong>pushplus</strong> → 把 token 粘贴到输入框 → 点 <strong>测试推送</strong>。
          </p>
          <div className="not-prose mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <div className="font-semibold mb-1">✅ 做到这步你应该看到</div>
            微信公众号「pushplus 推送加」立刻收到一条「正在保存您的通知渠道配置...」,说明 token 配对成功。
            之后点 <strong>保存</strong> 完成。
          </div>
        </li>
      </ol>

      <h2>常见问题</h2>

      <details>
        <summary>pushplus 和 Sever酱,到底选哪个?</summary>
        <p>现在(2024-08 之后)对比:</p>
        <ul>
          <li>
            <strong>Sever酱</strong>(<Link href="/help/serverchan">教程</Link>):
            <strong>完全免费</strong>,2 分钟搞定,5 条/天。适合大多数人。
          </li>
          <li>
            <strong>pushplus</strong>(本页):实名要付费(几元到几十元),3 分钟搞定,200 条/天,模板丰富。
            适合需要多设备转发/推送给多人(群组功能)的场景。
          </li>
        </ul>
        <p>
          <strong>新用户不知道选哪个?</strong> 默认选 Sever酱。pushplus 的高级功能等用熟了再考虑。
        </p>
      </details>

      <details>
        <summary>token 在哪里找 / 丢了?</summary>
        <p>
          登录 <a href={PUSHPLUS_LOGIN} target="_blank" rel="noreferrer">pushplus.plus</a> 后,
          顶部菜单 → 「<strong>个人中心</strong>」 → 左边栏 → 「<strong>我的token</strong>」。
        </p>
        <p>
          token 长期不变,丢了不需要重新注册,回原页面重新复制即可。
        </p>
      </details>

      <details>
        <summary>实名认证提示失败?</summary>
        <ul>
          <li>身份证号 + 姓名要和微信支付/银行预留信息一致</li>
          <li>检查 pushplus 页面报错信息(姓名格式错误 / 已实名过 等)</li>
          <li>实名是实名 pushplus 平台,不会影响本系统账号</li>
        </ul>
      </details>

      <details>
        <summary>测试推送收不到?</summary>
        <ol>
          <li>检查微信公众号「<strong>pushplus 推送加</strong>」是否已关注(没关注收不到,最常见原因)</li>
          <li>检查是否<strong>完成实名认证</strong>且<strong>已付费</strong>(未实名/未付费调用接口会返回错误)</li>
          <li>检查 token 是否复制完整(32 位左右,无空格无换行)</li>
          <li>在 pushplus 网站 → 「<strong>历史消息</strong>」看是否真的发出(显示 200 OK = 成功)</li>
          <li>部分企业微信/钉钉环境可能拦截公众号消息,换一个网络环境试试</li>
          <li>微信可能收纳到"服务通知"折叠区,下拉微信聊天列表找</li>
        </ol>
      </details>

      <details>
        <summary>提示 "token 无效" / "鉴权失败"?</summary>
        <ul>
          <li>token 复制时多带了空格或换行 — 重新复制,粘贴后用鼠标确认两边没有空白</li>
          <li>token 不是 32 位字母数字 — 可能复制错了字段(注意是"我的token",不是"我的UID"等)</li>
          <li>实名未完成或未付费 — 调接口会被拒,完成付费后等 5 分钟再试</li>
        </ul>
      </details>

      <details>
        <summary>可以推到企业微信/钉钉/飞书吗?</summary>
        <p>
          可以。pushplus 支持多渠道转发(微信公众号、企业微信、钉钉、飞书、邮件、Bark 等),
          需要在 pushplus 后台配置 webhook,然后改 API 请求里的 channel 参数。
        </p>
        <p>
          <strong>这部分本系统暂未集成</strong>,本系统固定用微信公众号。如需要后续可加。
        </p>
      </details>

      {/* 完成检查清单 */}
      <div className="not-prose mt-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="font-semibold text-slate-900 mb-2">✅ 完成检查清单</div>
        <ul className="text-sm text-slate-700 space-y-1">
          <li>☐ 微信已关注「pushplus 推送加」公众号</li>
          <li>☐ 已完成实名认证 + 付费(个人中心显示「已认证」)</li>
          <li>☐ 已在 pushplus 个人中心复制 token</li>
          <li>☐ 已在 <Link href="/me/settings?channel=pushplus">/me/settings?channel=pushplus</Link> 选 pushplus、粘贴、测试推送成功</li>
          <li>☐ 微信公众号「pushplus 推送加」收到测试消息</li>
        </ul>
        <div className="mt-3 text-xs text-slate-500">
          全打勾 = 配置完成。后续 170 天开始会自动推提醒,不用再做任何操作。
        </div>
      </div>

      <div className="not-prose mt-6 flex gap-3 flex-wrap">
        <Link
          href="/me/settings?channel=pushplus"
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

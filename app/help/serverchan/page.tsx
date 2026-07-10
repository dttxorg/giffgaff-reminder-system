import Link from "next/link";
import { ExternalLink } from "@/app/_components/external-link";

const SEVERCHAN_HOME = "https://sct.ftqq.com";
const SEVERCHAN_LOGIN = "https://sct.ftqq.com/login";
const SEVERCHAN_SENDKEY_PAGE = "https://sct.ftqq.com/sendkey";

export default function ServerChanHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <div className="mb-4">
        <Link href="/me" className="text-xs text-slate-500 hover:text-slate-900">
          ← 返回用户中心
        </Link>
      </div>
      <h1>Sever酱 开通教程</h1>
      <p>
        Sever酱 是一个把消息推送到<strong>微信公众号</strong>的服务。开通后,本系统给您发提醒时,微信会立即收到一条消息。
        <br />
        <span className="text-slate-500 text-sm">
          大约 2 分钟搞定,需要您有一个微信号。完全免费,每天 5 条推送额度(本系统提醒 180 天最多用 20 条,够用)。
        </span>
      </p>

      {/* 快速通道: 已有账号直接拿 SendKey */}
      <div className="not-prose my-6 p-4 rounded-lg bg-emerald-50 border border-emerald-300">
        <div className="font-semibold text-emerald-900 mb-1">⚡ 已经有 Sever酱 账号?直接拿 SendKey</div>
        <div className="text-sm text-emerald-800 mb-3">
          登录后首页就有您的 SendKey,点&quot;复制&quot;按钮,然后直接到第 3 步配置本系统。
        </div>
        <div className="flex flex-wrap gap-2">
          <ExternalLink href={SEVERCHAN_SENDKEY_PAGE} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-sm">
            🔑 直接拿 SendKey
          </ExternalLink>
          <ExternalLink href={SEVERCHAN_LOGIN} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-sm font-medium hover:bg-emerald-50">
            登录页 →
          </ExternalLink>
        </div>
      </div>

      <div className="not-prose my-6 flex flex-wrap gap-3">
        <ExternalLink href={SEVERCHAN_HOME} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm">
          🔗 打开 Sever酱 官网
        </ExternalLink>
        <ExternalLink href={SEVERCHAN_LOGIN} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
          直接登录 (已有账号)
        </ExternalLink>
      </div>

      <h2>步骤详解</h2>

      <ol>
        <li>
          <strong>打开 Sever酱 官网,扫首页二维码关注公众号</strong>
          <p>
            打开 <ExternalLink href={SEVERCHAN_HOME} className="">sct.ftqq.com</ExternalLink>,
            首页会看到一个 <strong>二维码</strong>(写着&quot;微信扫码关注&quot;)。
          </p>
          <p>用微信 <strong>扫一扫</strong> 扫这个二维码 → 弹出&quot;Server酱&quot;公众号 → 点 <strong>关注</strong>。</p>
          <div className="not-prose mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <div className="font-semibold mb-1">✅ 做到这步你应该看到</div>
            微信通讯录里多了一个公众号 <strong>「Server酱」</strong>(也叫「方糖气球」,运营品牌同名),
            头像是个蓝色方块。
          </div>
          <p className="text-slate-600 text-sm mt-3">
            <strong>没电脑?纯手机也能搞定</strong>:
          </p>
          <ul className="text-sm">
            <li>打开微信 → 通讯录右上角 <strong>+</strong> → <strong>添加朋友</strong></li>
            <li>选 <strong>公众号</strong> 标签</li>
            <li>搜索 <code>Server酱</code> 或 <code>方糖气球</code></li>
            <li>认准蓝色方块头像,点 <strong>关注</strong></li>
          </ul>
        </li>

        <li>
          <strong>登录 Sever酱 拿到 SendKey</strong>
          <p>
            访问 <ExternalLink href={SEVERCHAN_LOGIN} className="">sct.ftqq.com/login</ExternalLink>,
            用刚关注的微信扫页面上的登录二维码 → 微信会弹出&quot;确认登录&quot;提示,点确认。
          </p>
          <p>登录后会自动跳到 <ExternalLink href={SEVERCHAN_SENDKEY_PAGE} className="">SendKey 页面</ExternalLink>。</p>
          <div className="not-prose mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
            <div className="font-semibold text-slate-900 mb-1">SendKey 长这样:</div>
            <code className="text-slate-800 break-all">SCT2abcdefGhijKLMNopQRstUVwxYz123456789</code>
            <div className="text-slate-600 mt-1 text-xs">
              以 <code>SCT</code> 开头,后面跟几十位字母数字,点旁边的&quot;复制&quot;按钮。
            </div>
          </div>
          <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm mt-3">
            <strong>注意</strong>:SendKey 相当于您的密码,不要发给任何人。复制后妥善保存,丢了可以随时回 SendKey 页看。
          </p>
        </li>

        <li>
          <strong>回到本系统,设置通知渠道</strong>
          <p>根据您当前的状态,路径略有不同:</p>
          <ul>
            <li>
              <strong>首次设置(用户中心顶部有红色横幅)</strong>:点横幅里的&quot;立即设置&quot; → 跳到 <code>/me/settings</code>
            </li>
            <li>
              <strong>已登录要改渠道</strong>:直接访问 <Link href="/me/settings?channel=serverchan">/me/settings?channel=serverchan</Link>
            </li>
          </ul>
          <p>
            选 <strong>Sever酱</strong> → 把 SendKey 粘贴到输入框 → 点 <strong>测试推送</strong>。
          </p>
          <div className="not-prose mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <div className="font-semibold mb-1">✅ 做到这步你应该看到</div>
            微信公众号「Server酱」立刻收到一条「测试消息:正在保存您的通知渠道配置...」,说明 SendKey 配对成功。
            之后点 <strong>保存</strong> 完成。
          </div>
        </li>
      </ol>

      <h2>常见问题</h2>

      <details>
        <summary>SendKey 在哪里找 / 忘了?</summary>
        <p>
          登录 <ExternalLink href={SEVERCHAN_LOGIN} className="">sct.ftqq.com/login</ExternalLink> 后,
          直接访问 <ExternalLink href={SEVERCHAN_SENDKEY_PAGE} className="">sct.ftqq.com/sendkey</ExternalLink> 就能看到。
          同一账号 SendKey 长期不变,丢了不需要重新注册。
        </p>
      </details>

      <details>
        <summary>扫码登录时微信不弹确认框?</summary>
        <ul>
          <li>检查微信网络是否正常(部分代理/办公网会拦截二维码)</li>
          <li>用手机微信直接扫(不要用电脑端微信,扫不上)</li>
          <li>等 30 秒,微信推送有延迟</li>
          <li>Sever酱 网站顶部会显示&quot;等待扫码...&quot;状态,扫了会变绿色</li>
        </ul>
      </details>

      <details>
        <summary>提示 &quot;SendKey 无效&quot; / &quot;鉴权失败&quot;?</summary>
        <ul>
          <li>SendKey 复制时多带了空格或换行 — 重新复制,粘贴后用鼠标确认两边没有空白字符</li>
          <li>SendKey 不是以 <code>SCT</code> 开头 — 复制错了,可能复制成了别的内容</li>
          <li>账号被封 — 长期不用的 Sever酱 账号会被回收,需要重新注册</li>
        </ul>
      </details>

      <details>
        <summary>测试推送收不到 / 微信没响?</summary>
        <ol>
          <li>检查微信公众号&quot;Server酱&quot;是否<strong>已关注</strong>(没关注收不到,这是最常见原因)</li>
          <li>检查 SendKey 是否以 <code>SCT</code> 开头且长度对(几十位)</li>
          <li>等 1-2 分钟,微信推送有延迟</li>
          <li>在 Sever酱 网站 → &quot;发送记录&quot; 看是否真的发出(显示 200 OK = 成功,微信收不到是微信侧的问题)</li>
          <li>微信可能被收纳到&quot;服务通知&quot;折叠区,下拉微信聊天列表找</li>
        </ol>
      </details>

      <details>
        <summary>免费版有限制吗?要钱吗?</summary>
        <p>
          <strong>完全免费</strong>,Sever酱 不收任何费用。免费版每天 <strong>5 条</strong> 推送。
        </p>
        <p>
          本系统的提醒规则在 180 天内最多 20 条,平均到 180 天 ≈ 每 9 天 1 条,远低于 5 条/天的限制。
          即便在最密集的 180 天当天(10 条/天)也只用掉一天额度的 2 倍 — 不会超额。
        </p>
      </details>

      <details>
        <summary>想换其他渠道(微信公众号推送之外)?</summary>
        <p>
          iPhone 用户推荐 <Link href="/help/bark">Bark</Link>(iOS 专属,1 分钟搞定,免关注公众号)。
          能用 Telegram 的推荐 <Link href="/help/telegram">Telegram Bot</Link>(跨平台,免审核)。
        </p>
      </details>

      <h2>数据流 / 隐私</h2>
      <p>
        每次发提醒时,本系统会向 Sever酱 接口 <code>https://sct.ftqq.com/{`{SendKey}`}.send</code> POST 一条消息。
      </p>
      <ul>
        <li>请求内容:<strong>推送标题 + 正文</strong>(例如 &quot;还有 5 天到期&quot;)</li>
        <li>可标识信息:<strong>仅 sim 编号和后 6 位</strong>,不传完整手机号</li>
        <li>不会发送:激活日期、保号历史、IMEI、设备信息等</li>
        <li>Sever酱 再把消息转给<strong>微信公众号</strong>(通过微信官方接口)</li>
        <li>注意:Sever酱 推送会显示<strong>来自「Sever酱」公众号</strong>的消息(不是私人号)</li>
      </ul>

      {/* 完成检查清单 */}
      <div className="not-prose mt-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="font-semibold text-slate-900 mb-2">✅ 完成检查清单</div>
        <ul className="text-sm text-slate-700 space-y-1">
          <li>☐ 微信已关注「Server酱」公众号</li>
          <li>☐ 已在 sct.ftqq.com 登录并复制 SendKey(以 SCT 开头)</li>
          <li>☐ 已在 <Link href="/me/settings?channel=serverchan">/me/settings?channel=serverchan</Link> 选 Sever酱、粘贴、测试推送成功</li>
          <li>☐ 微信公众号「Server酱」收到测试消息</li>
        </ul>
        <div className="mt-3 text-xs text-slate-500">
          全打勾 = 配置完成。后续 170 天开始会自动推提醒,不用再做任何操作。
        </div>
      </div>

      <div className="not-prose mt-6 flex gap-3 flex-wrap">
        <Link
          href="/me/settings?channel=serverchan"
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
          href="/help/pushplus"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          查看 pushplus 教程
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

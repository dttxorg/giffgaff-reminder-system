import Link from "next/link";

const BOTFATHER_URL = "https://t.me/BotFather";
const USERINFOBOT_URL = "https://t.me/userinfobot";
const GETUPDATES_HINT = "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates";

export default function TelegramHelpPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12 prose prose-slate">
      <h1>Telegram Bot 开通教程</h1>
      <p>
        Telegram Bot 是 Telegram 内置的机器人,可以主动给您的私聊发消息。开通后,本系统给您发提醒时,您的 Telegram 会立即收到一条带 <code>保号链接</code> 的消息。
        <br />
        <span className="text-slate-500 text-sm">
          大约 5 分钟搞定。优点:跨平台(iOS/Android/Mac/Windows/Web)、免审核、即时送达。
        </span>
      </p>

      <div className="not-prose my-6 flex flex-wrap gap-3">
        <a
          href="https://telegram.org/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors shadow-sm"
        >
          ✈️ 打开 Telegram
        </a>
        <a
          href={BOTFATHER_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          🤖 打开 @BotFather
        </a>
      </div>

      <div className="not-prose my-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <strong>📱 还没装 Telegram?</strong>
        <p className="mt-1">
          Telegram 是免费 App,国内可直连。直接在 App Store / Google Play 搜 <code>Telegram</code> 下载,
          或访问 <a href="https://telegram.org/" target="_blank" rel="noreferrer" className="underline">telegram.org</a>。
        </p>
      </div>

      <h2>步骤详解</h2>

      <ol>
        <li>
          <strong>创建一个 Telegram Bot(用 @BotFather)</strong>
          <p>
            在 Telegram 里搜索 <a href={BOTFATHER_URL} target="_blank" rel="noreferrer">@BotFather</a> 并打开对话,
            点"Start"开始。
          </p>
          <p>
            发送命令 <code>/newbot</code>,按提示操作:
          </p>
          <ul>
            <li>它会问你 bot 的名字(随便起,比如 <code>Giffgaff 保号提醒</code>)</li>
            <li>再问 bot 的 username(必须以 <code>bot</code> 结尾,比如 <code>my_gg_reminder_bot</code>),<strong>全网唯一不能重复</strong></li>
          </ul>
          <p>
            创建成功后会收到一条消息,里面有一行 <code>Use this token to access the HTTP API:</code>,
            下面那一长串就是你的 <strong>Bot Token</strong>。
          </p>
          <p className="text-rose-700 bg-rose-50 p-3 rounded text-sm">
            <strong>⚠️ Bot Token 相当于密码</strong>,不要发给任何人,也不要贴到公开的群。
          </p>
        </li>

        <li>
          <strong>跟自己的 bot 说句话(激活它)</strong>
          <p>
            在 Telegram 搜索框搜你刚创建的 bot 的 username(比如 <code>@my_gg_reminder_bot</code>),点进去,
            点底部的 <strong>Start</strong> 按钮(或发送 <code>/start</code>)。
          </p>
          <p className="text-slate-600 text-sm">
            这一步是必须的 — bot 必须先收到你的消息,才能给你发消息。
          </p>
        </li>

        <li>
          <strong>拿到自己的 Chat ID(你的数字 ID)</strong>
          <p>有两种方法,选一种就行:</p>
          <p>
            <strong>方法 A(推荐,1 步搞定)</strong>:在 Telegram 搜索 <a href={USERINFOBOT_URL} target="_blank" rel="noreferrer">@userinfobot</a>,
            点进去点 <strong>Start</strong>,它会立刻回复你一行字,里面 <code>Id:</code> 后面的数字就是你的 Chat ID。
          </p>
          <p>
            <strong>方法 B(用 getUpdates 接口)</strong>:在浏览器打开
            <br />
            <code>https://api.telegram.org/bot&lt;你的bot token&gt;/getUpdates</code>
            <br />
            替换成你的 bot token。在返回的 JSON 里找 <code>"chat":&#123;"id": 123456789, ...&#125;</code>,那个数字就是你的 Chat ID。
          </p>
          <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm">
            <strong>注意</strong>:
            <ul className="mt-1 space-y-1 list-disc pl-5">
              <li>Chat ID 是一串<strong>纯数字</strong>(私聊)或以 <code>-</code> 开头的负数(群组)</li>
              <li>本系统存的是 <strong>私聊 ID</strong>(正数),不要复制成 username(@xxx)</li>
            </ul>
          </p>
        </li>

        <li>
          <strong>把 Token 和 Chat ID 填到本系统</strong>
          <p>
            在设置页选 <strong>Telegram</strong> 渠道,把第 1 步拿到的 Bot Token 和第 3 步拿到的 Chat ID 用 <code>|</code> 连起来,例如:
          </p>
          <p>
            <code>123456789:ABCDefGhiJklMnoPQRstUvwxYZ|987654321</code>
          </p>
          <p>
            格式严格:<code>botToken</code> + 竖线 + <code>chatId</code>,中间<strong>不要有空格</strong>。
          </p>
          <p>
            点 <strong>测试推送</strong>,Telegram 应立即收到一条带 <code>Giffgaff 保号提醒 - 测试</code> 标题的消息,说明配置成功。点"保存"完成。
          </p>
        </li>
      </ol>

      <h2>常见问题</h2>

      <details>
        <summary>Bot Token 在哪里找?</summary>
        <p>
          在 Telegram 里打开 <a href={BOTFATHER_URL} target="_blank" rel="noreferrer">@BotFather</a>,
          发送 <code>/token</code> 或 <code>/mybots</code> → 选择你的 bot →
          "<strong>API Token</strong>" 即可看到。
        </p>
        <p className="text-slate-500 text-sm">
          如果 token 泄露(被人看到了),在 @BotFather 里 <code>/revoke</code> 然后重新生成一个,
          再到本系统更新。
        </p>
      </details>

      <details>
        <summary>Chat ID 在哪里找?(快速复述)</summary>
        <ul>
          <li>
            <strong>最简单</strong>:打开 <a href={USERINFOBOT_URL} target="_blank" rel="noreferrer">@userinfobot</a> 发 <code>/start</code>,回复里 <code>Id:</code> 后面就是
          </li>
          <li>
            <strong>备用</strong>:浏览器访问 <code>https://api.telegram.org/bot&lt;token&gt;/getUpdates</code> 找 <code>chat.id</code>
          </li>
        </ul>
        <p className="text-slate-500 text-sm">
          注:如果用方法 B 看不到 <code>chat.id</code>,确认你已经先给 bot 发过 <code>/start</code>(第 2 步)。
        </p>
      </details>

      <details>
        <summary>测试推送收不到?</summary>
        <ul>
          <li>
            <strong>检查是否给 bot 发过 <code>/start</code></strong>(必须,否则 bot 主动发消息会被 Telegram 拒收)
          </li>
          <li>
            检查 channelKey 格式:<code>botToken|chatId</code>,竖线必须是英文 <code>|</code>(不是中文)
          </li>
          <li>
            检查 chatId 是否复制成 username(@xxx_bot)而不是纯数字
          </li>
          <li>
            检查 bot token 是否过期(被 @BotFather /revoke 过)或带多余空格/换行
          </li>
          <li>
            极个别情况下 Telegram 接口会临时 5xx,等几分钟重试
          </li>
        </ul>
      </details>

      <details>
        <summary>可以推送给群组吗?</summary>
        <p>
          可以。把 chatId 换成群组的 ID(以 <code>-</code> 开头的负数,如 <code>-1001234567890</code>)即可。
          bot 必须先被加到群组里,本系统推的消息会发到群组。
        </p>
        <p className="text-slate-500 text-sm">
          拿群组 ID 的方法:把 bot 拉进群后,访问 <code>https://api.telegram.org/bot&lt;token&gt;/getUpdates</code> 找 <code>chat.id</code>。
        </p>
      </details>

      <details>
        <summary>免费吗?有发送限制吗?</summary>
        <p>
          Telegram Bot API <strong>完全免费</strong>。官方限制:
        </p>
        <ul>
          <li>同一 bot 给同一 chat 推送:最多 <strong>1 条/秒</strong></li>
          <li>同一 bot 给不同 chat 推送:最多 <strong>30 条/秒</strong></li>
        </ul>
        <p>
          本系统一位用户 180 天最多推 20 条,远低于限制。
        </p>
      </details>

      <details>
        <summary>Telegram Bot vs Sever酱,选哪个?</summary>
        <ul>
          <li>
            <strong>Telegram Bot</strong>:跨平台、即时、免关注公众号、免费无限;缺点是要装 Telegram(国内部分网络环境可能需要代理)
          </li>
          <li>
            <strong>Sever酱</strong>:走微信公众号,国内直连无障碍,免费,每天 5 条;缺点是要关注公众号
          </li>
        </ul>
        <p>
          能用 Telegram 的推荐 Bot;不能的就用 Sever酱。pushplus 实名要付费,新用户不建议。
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
          href="/help/pushplus"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
        >
          查看 pushplus 教程
        </Link>
      </div>
    </article>
  );
}

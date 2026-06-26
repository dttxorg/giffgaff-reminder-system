import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
          Giffgaff SIM 卡保号提醒
        </h1>
        <p className="text-slate-600 text-lg">
          再也不用记着哪天该保号了 — 到日子自动推送给您
        </p>
      </div>

      <a
        href="https://gg.681218.xyz"
        target="_blank"
        rel="noopener noreferrer"
        className="group block mb-12 rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <div className="text-5xl sm:text-6xl shrink-0 drop-shadow">🎁</div>
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur rounded text-xs font-medium mb-2">
              🔥 限时活动
            </div>
            <div className="text-xl sm:text-2xl font-bold mb-1 leading-tight">
              还没卡？现在购 Giffgaff SIM 卡
            </div>
            <div className="text-white/95 text-sm sm:text-base">
              <strong className="font-semibold">免费赠送保号提醒服务</strong>
              <span className="mx-1.5">·</span>
              新开卡 / 续号都行
            </div>
          </div>
          <div className="px-6 py-3 bg-white text-pink-600 font-bold rounded-xl whitespace-nowrap shadow-md group-hover:scale-105 transition-transform text-base">
            立即选购 →
          </div>
        </div>
      </a>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="text-2xl mb-2">📅</div>
          <h3 className="font-semibold mb-1">从激活第 170 天起</h3>
          <p className="text-sm text-slate-600">系统自动开始提醒您保号</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="text-2xl mb-2">⏰</div>
          <h3 className="font-semibold mb-1">越临近越频繁</h3>
          <p className="text-sm text-slate-600">第 178 天 3 次 / 179 天 5 次 / 180 天 10 次</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="text-2xl mb-2">📲</div>
          <h3 className="font-semibold mb-1">Sever酱 / Bark 推送</h3>
          <p className="text-sm text-slate-600">绑定一次,自动提醒</p>
        </div>
      </div>

      <div className="flex flex-col items-center mb-12 gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          立即登录 / 绑定
        </Link>
        <Link
          href="/redeem"
          className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          有卡密？立即兑换 →
        </Link>
      </div>

      <section id="faq" className="space-y-3">
        <h2 className="text-xl font-semibold mb-4">常见问题</h2>
        <Faq
          q="Giffgaff 卡为什么要保号？"
          a="Giffgaff SIM 卡如果长期不活跃(不发起通话/短信/上网),运营商会在 6 个月后回收号码。保号就是通过任何付费活动(发短信、打电话)让卡保持活跃。"
        />
        <Faq
          q="保号提醒是怎么触发的？"
          a="从您的卡激活日起算,第 170 天系统开始给您发提醒。随着临近 180 天截止日,提醒频率自动增加。180 天当天会推 10 次,之后停止。"
        />
        <Faq
          q="推送渠道怎么选？"
          a="Sever酱 / pushplus(微信公众号)适合大多数用户。Bark 适合 iOS 用户。Telegram Bot 适合能用 Telegram 的同学,免关注公众号、跨平台、即时送达。任意选一个就行,登录后可以在「设置」里改。"
        />
        <Faq
          q="账号忘了 / 想换推送渠道？"
          a="重新登录一次就行,登录时会更新您的渠道信息。原账号自动作废,新登录会覆盖。"
        />
        <Faq
          q="我能在公众号/Bark 看到什么内容？"
          a="推送里会带一个链接,点进去就是保号时间更新页。选今天/最近 7 天内的一个日期提交,系统就从那天重新计时 170 天。"
        />
        <Faq
          q="卡密是什么 / 怎么用？"
          a="如果您是从销售方获得的一串 16 位卡密(形如 XXXX-XXXX-XXXX-XXXX),可以访问兑换页输入卡密 + 您的 Giffgaff SIM 卡号 + 激活日期完成绑定。卡密一次性使用,兑换后失效。"
        />
      </section>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="bg-white rounded-lg border border-slate-200 group">
      <summary className="cursor-pointer px-4 py-3 font-medium text-slate-900 list-none flex items-center justify-between">
        <span>{q}</span>
        <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-3 text-slate-600 text-sm leading-relaxed">{a}</div>
    </details>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
          Giffgaff SIM 卡保号提醒
        </h1>
        <p className="text-slate-600 text-lg">
          再也不用记着哪天该保号了 — 到日子自动推送给您
        </p>
      </div>

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

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          立即登录 / 绑定
        </Link>
        <a
          href="#faq"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors border border-slate-200"
        >
          了解更多
        </a>
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
          a="Sever酱(微信公众号推送)适合大多数用户。Bark(iOS/Android App)适合不想用微信的同学。两种都可以,登录时选一个就行。"
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
          q="我是管理员,在哪里维护号码库？"
          a="管理员入口仅供系统所有者使用,普通用户无需关注。如确需管理,请联系系统所有者获取入口地址和账号。"
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

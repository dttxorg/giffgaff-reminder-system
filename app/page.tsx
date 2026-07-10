import Link from "next/link";
import { prisma } from "@/lib/db";

/**
 * 公开 stat:首页底部 social proof 用
 * 缓存 60s(数据允许滞后,避免每次访问都打 DB)
 */
async function getPublicStats() {
  const [simCount, sentCount] = await Promise.all([
    prisma.sim.count(),
    prisma.reminderSent.count({ where: { status: "success" } }),
  ]);
  return { simCount, sentCount };
}

export const revalidate = 60;
// H6 用了 DB count,build 时没有 DB → 强制 dynamic 渲染
export const dynamic = "force-dynamic";

/** 首页 feature card 用的 SVG 图标 — H1 修复,从 emoji 改为一致品牌 */
function HomeIcon({ name }: { name: "calendar" | "alert" | "bell" }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "text-indigo-600",
  };
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default async function HomePage() {
  const { simCount, sentCount } = await getPublicStats();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
          Giffgaff SIM 卡保号提醒
        </h1>
        <p className="text-slate-600 text-lg mb-4">
          再也不用记着哪天该保号了 — 到日子自动推送给您
        </p>
        {/* H6:social proof — 公开 stat,无敏感信息 */}
        {simCount > 0 && (
          <p className="text-xs text-slate-500">
            已有 <strong className="text-slate-700">{simCount}</strong> 个号码正在被守护
            {sentCount > 0 && (
              <>
                {" "}· 已送达 <strong className="text-slate-700">{sentCount}</strong> 条保号提醒
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="mb-2">
            <HomeIcon name="calendar" />
          </div>
          <h3 className="font-semibold mb-1">从激活第 170 天起</h3>
          <p className="text-sm text-slate-600">系统自动开始提醒您保号</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="mb-2">
            <HomeIcon name="alert" />
          </div>
          <h3 className="font-semibold mb-1">越临近越频繁</h3>
          <p className="text-sm text-slate-600">第 178 天 3 次 / 179 天 5 次 / 180 天 10 次</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="mb-2">
            <HomeIcon name="bell" />
          </div>
          <h3 className="font-semibold mb-1">Sever酱 / Bark 推送</h3>
          <p className="text-sm text-slate-600">绑定一次,自动提醒</p>
        </div>
      </div>

      {/* 两条主路径并列:已有账号登录 / 卡密新用户兑换。
          把卡密入口从浅色文字链提升为同样大小的按钮,因为卡密用户是新用户最大来源。 */}
      <div className="grid sm:grid-cols-2 gap-3 mb-12">
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          立即登录 / 绑定
        </Link>
        <Link
          href="/redeem"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white border-2 border-indigo-600 text-indigo-700 font-medium hover:bg-indigo-50 transition-colors shadow-sm"
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mr-1.5"
          >
            <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
            <path d="M13 5v14" strokeDasharray="2 2" />
          </svg>
          有卡密?立即兑换
        </Link>
      </div>
      <p className="text-center text-xs text-slate-500 -mt-9 mb-12">
        没有卡密?请联系管理员录入或访问<a href="/login" className="text-indigo-600 hover:underline">登录页</a>。
      </p>

      <section id="faq" className="space-y-3">
        <h2 className="text-xl font-semibold mb-4">常见问题</h2>
        <Faq
          defaultOpen
          q="Giffgaff 卡为什么要保号？"
          a="Giffgaff SIM 卡如果长期不活跃(不发起通话/短信/上网),运营商会在 6 个月后回收号码。保号就是通过任何付费活动(发短信、打电话)让卡保持活跃。"
        />
        <Faq
          defaultOpen
          q="保号提醒是怎么触发的？"
          a="从您的卡激活日起算,第 170 天系统开始给您发提醒。随着临近 180 天截止日,提醒频率自动增加。180 天当天会推 10 次,之后停止。"
        />
        <Faq
          q="推送渠道怎么选？"
          a="Sever酱(微信公众号)免费好用,适合大多数用户。Bark 适合 iOS 用户。Telegram Bot 适合能用 Telegram 的同学,免关注公众号、跨平台、即时送达。pushplus 现在实名要收费,新用户不建议(已付费实名的老用户仍可继续用)。任意选一个就行,登录后可以在「设置」里改。"
        />
        <Faq
          q="账号忘了 / 想换推送渠道？"
          a="重新登录一次就行,登录时会更新您的渠道信息。原账号自动作废,新登录会覆盖。"
        />
        <Faq
          q="我能在公众号/Bark 看到什么内容？"
          a="推送里会带一个链接,点进去就是保号时间更新页。选您最近一次保号的日期提交（不早于激活日期,不晚于今天）,系统就从那天重新计时 170 天。老用户（卡已用很久）可以补录很久以前的保号日期。"
        />
        <Faq
          q="卡密是什么 / 怎么用?"
          a="16 位字母数字的销售凭证。在兑换页填卡密 + 您的 Giffgaff SIM 卡号 + 激活日期即可绑定。一次性使用,详细步骤见登录页。"
        />
      </section>
    </div>
  );
}

function Faq({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  return (
    <details
      className="bg-white rounded-lg border border-slate-200 group"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-4 py-3 font-medium text-slate-900 list-none flex items-center justify-between">
        <span>{q}</span>
        <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
      </summary>
      <div className="px-4 pb-3 text-slate-600 text-sm leading-relaxed">{a}</div>
    </details>
  );
}

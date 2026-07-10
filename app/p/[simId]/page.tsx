"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/app/_components/skip-to-content";
import { formatPhoneForDisplay } from "@/lib/phone";
import { todayLocalISODate } from "@/lib/date";

interface SimInfo {
  phoneNumber: string;
  activatedAt: string;
  lastPortedAt: string | null;
  dayOffset: number;
  /** 不可枚举的公开 URL 标识;老 sim 可能在 lazy-backfill 后才填上 */
  portToken: string | null;
}

/**
 * URL 中的 simId 参数可以是:
 * - 老 int id (向后兼容旧的 /p/42)
 * - 新 portToken (不可枚举,32 字符 url-safe)
 *
 * 这两种都传给 API,由 API 决定如何查询。客户端只做"基本格式合法"校验,
 * 不区分形态。
 */
function isParamValid(s: string): boolean {
  // 老 int: 1+ 位数字
  if (/^\d+$/.test(s)) return true;
  // 新 token: url-safe, 16-64 字符
  return /^[A-Za-z0-9_-]{16,64}$/.test(s);
}

export default function PortPage() {
  const params = useParams<{ simId: string }>();
  const router = useRouter();
  const simIdRaw = params.simId;
  const simIdValid = isParamValid(simIdRaw);
  const [sim, setSim] = useState<SimInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [portedAt, setPortedAt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!simIdValid) return;
    // 保留原始字符串(todo: 后续如果 Next.js 自动 encode 可省略 encodeURIComponent)
    fetch(`/api/p/${encodeURIComponent(simIdRaw)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: SimInfo) => {
        // P6 安全修复:URL 是老 int 形式 且 sim 已有 portToken → 跳到 token URL
        // 防止公开 URL 可枚举。replace 而非 push,避免 back 按钮回环到 int URL。
        if (/^\d+$/.test(simIdRaw) && data.portToken) {
          router.replace(`/p/${data.portToken}`);
          return;
        }
        setSim(data);
        setPortedAt(todayLocalISODate());
      })
      .catch(() => setNotFound(true));
  }, [simIdRaw, simIdValid, router]);

  // 最早可选 = 激活日期（API 返回的 YYYY-MM-DD 字符串，可直接用于 input[type=date] 的 min）
  // 计算放在 sim 已确认非 null 之后（下方 early return），这里用占位避免 TS 报错
  // maxDate 必须按用户本地时区的"今天"算(详见 lib/date.ts 的注释)。
  const maxDate = todayLocalISODate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/p/${encodeURIComponent(simIdRaw)}/port`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portedAt }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "提交失败");
        return;
      }
      setSuccess(true); // 跳转交由 SuccessPage 组件管理(可取消)
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (notFound || !simIdValid) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <PublicBrandHeader />
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-2">404</div>
          <h1 className="text-xl font-bold mb-2">未找到该 SIM 卡</h1>
          <p className="text-slate-600 text-sm mb-4">链接可能已失效</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
            <Link href="/" className="text-indigo-600 hover:underline">
              返回首页
            </Link>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <Link href="/redeem" className="text-indigo-600 hover:underline">
              我有卡密
            </Link>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <Link href="/login" className="text-indigo-600 hover:underline">
              登录页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sim) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center text-slate-500">
        <Spinner size={18} label="加载中" />
      </div>
    );
  }

  if (success) {
    return <SuccessPage />;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <PublicBrandHeader />
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold mb-1">Giffgaff 保号</h1>
        <p className="text-slate-600 text-sm mb-3">
          保号后系统按新日期重新计时 170 天
        </p>
        <details className="mb-5 group">
          <summary className="text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer list-none inline-flex items-center gap-1">
            <span aria-hidden="true" className="group-open:rotate-90 transition-transform inline-block">▸</span>
            <span>保号是什么意思?</span>
          </summary>
          <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              <strong>保号</strong> = 让 SIM 卡保持活跃,避免被运营商回收。
            </p>
            <p>
              方式很简单:任意一种付费活动即可 ——
              <strong>发一条短信</strong>(发给自己或朋友都行)、<strong>打个电话</strong>、或<strong>用流量上一次网</strong>。
            </p>
            <p>
              giffgaff 政策:连续 <strong>180 天</strong>无任何活动会回收号码(连同余额、sim 卡本身)。
            </p>
          </div>
        </details>

        <div className="rounded-lg bg-slate-50 p-4 mb-6">
          <div className="text-xs text-slate-500 mb-1">号码</div>
          <div className="text-lg font-mono font-semibold tracking-wider mb-2">
            {formatPhoneForDisplay(sim.phoneNumber)}
          </div>
          <div className="text-xs text-slate-500 mb-1">激活日期</div>
          <div className="text-sm mb-2">{sim.activatedAt}</div>
          <div className="text-xs text-slate-500 mb-1">已激活</div>
          <div className="text-2xl font-bold text-indigo-600">
            {sim.dayOffset} <span className="text-sm font-normal text-slate-500">天</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              新的保号日期
            </label>
            <input
              type="date"
              value={portedAt}
              onChange={(e) => setPortedAt(e.target.value)}
              min={sim.activatedAt}
              max={maxDate}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              最早可填激活日期（{sim.activatedAt}），最晚今天；老用户可补录任意历史保号日期
            </p>
          </div>

          {/* P5: 解释什么是保号,新用户常问 */}
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer text-slate-600 hover:text-slate-900 list-none flex items-center gap-1">
              <span aria-hidden="true">?</span>
              <span>什么是&ldquo;保号&rdquo;?怎么操作?</span>
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
              <p>
                <strong>保号</strong> = 让运营商知道你这张卡还在用,避免被回收。
                Giffgaff 卡 6 个月不活跃就会被回收号码。
              </p>
              <p>任意付费活动即可保号,简单做法:</p>
              <ul className="list-disc list-inside pl-1 space-y-0.5">
                <li>用本机号发一条短信(给自己也算,收月租或套餐内)</li>
                <li>拨打一个号码(接通即扣月租)</li>
                <li>用本机号开热点或浏览网页(MB 流量都算)</li>
              </ul>
              <p className="text-slate-500">只要做了其中一种,保号日期就更新到今天。</p>
            </div>
          </details>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "提交中..." : "提交"}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * 保号成功页:实时倒计时 + "立即返回" + "撤销" 操作按钮
 * 让用户掌控节奏,不用瞎等 3 秒也不知道是否会真跳。
 */
function SuccessPage() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled) return;
    if (secondsLeft <= 0) {
      router.push("/");
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, cancelled, router]);

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <PublicBrandHeader />
      <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-8 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">✅</div>
        <h1 className="text-xl font-bold mb-2 text-emerald-900">已记录</h1>
        <p className="text-slate-600">
          新的保号日期已记录,下次提醒将在 170 天后
        </p>
        {!cancelled ? (
          <p className="text-xs text-slate-400 mt-3" aria-live="polite">
            {secondsLeft > 0 ? (
              <>{secondsLeft} 秒后自动跳回首页...</>
            ) : (
              <>正在跳转...</>
            )}
          </p>
        ) : (
          <p className="text-xs text-slate-400 mt-3">已取消自动跳转</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            立即返回首页
          </button>
          {!cancelled && secondsLeft > 0 && (
            <button
              type="button"
              onClick={() => setCancelled(true)}
              className="px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              留在此页
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * 公开链接顶部小标识 — P1 修复:让用户知道这是公开保号页面,
 * 跟登录后的用户中心区分开。
 */
function PublicBrandHeader() {
  return (
    <div className="text-xs text-slate-500 mb-3 flex items-center justify-center gap-2">
      <span className="inline-block w-5 h-5 rounded bg-indigo-600 text-white text-center leading-5 align-middle">
        G
      </span>
      <span className="align-middle">Giffgaff 保号提醒 · 公开保号链接</span>
    </div>
  );
}

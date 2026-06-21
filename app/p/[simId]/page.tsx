"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SimInfo {
  phoneNumber: string;
  activatedAt: string;
  lastPortedAt: string | null;
  dayOffset: number;
}

export default function PortPage() {
  const params = useParams<{ simId: string }>();
  const router = useRouter();
  const simId = parseInt(params.simId, 10);
  const simIdValid = Number.isFinite(simId) && simId > 0;
  const [sim, setSim] = useState<SimInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [portedAt, setPortedAt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!simIdValid) return;
    fetch(`/api/p/${simId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: SimInfo) => {
        setSim(data);
        setPortedAt(new Date().toISOString().slice(0, 10));
      })
      .catch(() => setNotFound(true));
  }, [simId, simIdValid]);

  // 7 天前的日期作为最早可选
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const maxDate = new Date().toISOString().slice(0, 10);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/p/${simId}/port`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portedAt }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "提交失败");
        return;
      }
      setSuccess(true);
      // 3 秒后跳走
      setTimeout(() => router.push("/"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (notFound || !simIdValid) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-4xl mb-2">404</div>
          <h1 className="text-xl font-bold mb-2">未找到该 SIM 卡</h1>
          <p className="text-slate-600 text-sm mb-4">链接可能已失效</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!sim) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center text-slate-500">
        加载中...
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-xl font-bold mb-2 text-emerald-900">已记录</h1>
          <p className="text-slate-600">
            新的保号日期已记录,下次提醒将在 170 天后
          </p>
          <p className="text-xs text-slate-400 mt-3">3 秒后自动跳回首页...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold mb-1">Giffgaff 保号</h1>
        <p className="text-slate-600 text-sm mb-6">
          保号后系统按新日期重新计时 170 天
        </p>

        <div className="rounded-lg bg-slate-50 p-4 mb-6">
          <div className="text-xs text-slate-500 mb-1">号码</div>
          <div className="text-lg font-mono font-semibold tracking-wider mb-2">
            {sim.phoneNumber.replace(/^(\d{5})(\d+)/, "$1 $2")}
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
              min={minDate}
              max={maxDate}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              今天 ~ 过去 7 天内可补录,未来日期不允许
            </p>
          </div>

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

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/app/_components/skip-to-content";

interface SimData {
  id: number;
  phoneNumber: string;
  activatedAt: string;
  lastPortedAt: string | null;
  status: "active" | "paused";
  user: { id: number; channel: string } | null;
  recentReminders: {
    id: number;
    dayOffset: number;
    bucket: number;
    sentAt: string;
    status: "success" | "failed";
    errorMessage: string | null;
  }[];
}

export default function EditSimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sim, setSim] = useState<SimData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activatedAt, setActivatedAt] = useState("");
  const [lastPortedAt, setLastPortedAt] = useState<string>("");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/sims/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: SimData) => {
        setSim(data);
        setPhoneNumber(data.phoneNumber);
        setActivatedAt(data.activatedAt);
        setLastPortedAt(data.lastPortedAt || "");
        setStatus(data.status);
      })
      .catch(() => setError("加载失败"));
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/sims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          activatedAt,
          lastPortedAt: lastPortedAt || null,
          status,
        }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      router.push("/admin/sims");
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("确认删除该号码?所有相关 user / reminder 也会被级联删除。")) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/sims/${id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "删除失败");
        return;
      }
      router.push("/admin/sims");
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (!sim && !error) {
    return (
      <div className="p-8 text-slate-500">
        <Spinner size={18} label="加载中" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">编辑号码 #{id}</h1>
        <Link href="/admin/sims" className="text-sm text-slate-500 hover:text-slate-900">
          ← 返回列表
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">手机号</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">激活日期</label>
          <input
            type="date"
            value={activatedAt}
            onChange={(e) => setActivatedAt(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">上次保号日期 (留空表示未保过)</label>
          <input
            type="date"
            value={lastPortedAt}
            onChange={(e) => setLastPortedAt(e.target.value)}
            min={activatedAt || undefined}
            disabled={!activatedAt}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-1">
            不能早于激活日期
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">状态</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "paused")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 outline-none"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
          </select>
        </div>

        {sim?.user && (
          <div className="text-sm text-slate-500 p-3 rounded-lg bg-slate-50">
            已绑定 user: {sim.user.channel} (id: {sim.user.id})
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm font-medium hover:bg-rose-100 disabled:opacity-50"
          >
            删除
          </button>
        </div>
      </form>

      {/* 最近推送记录: admin 排错最常用信息(为什么最近没收到/失败了) */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">最近 5 条推送</h2>
          <Link
            href={`/admin/reminders?simId=${sim?.id ?? id}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        {!sim?.recentReminders || sim.recentReminders.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            暂无推送记录
          </p>
        ) : (
          <ul className="space-y-2">
            {sim.recentReminders.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span
                  className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                    r.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-slate-700">
                      第 {r.dayOffset} 天 · 第 {r.bucket + 1} 桶
                    </span>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${
                        r.status === "success"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {r.status === "success" ? "送达" : "失败"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {r.sentAt} UTC
                  </div>
                  {r.errorMessage && (
                    <div
                      className="text-xs text-rose-700 mt-1 break-words"
                      title={r.errorMessage}
                    >
                      {r.errorMessage.length > 80
                        ? r.errorMessage.slice(0, 80) + "…"
                        : r.errorMessage}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

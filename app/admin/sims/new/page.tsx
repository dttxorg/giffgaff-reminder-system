"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSimPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activatedAt, setActivatedAt] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, activatedAt, status }),
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

  return (
    <div className="p-6 sm:p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">新增号码</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">手机号</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="07724215611（只填数字）"
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
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

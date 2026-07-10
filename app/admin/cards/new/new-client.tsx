"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCardCode } from "@/lib/card-key";

export function NewCardClient() {
  const router = useRouter();
  const [count, setCount] = useState(10);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setCreated(null);
    try {
      const resp = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, notes: notes || undefined }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "生成失败");
        return;
      }
      setCreated(data.cards.map((c: { code: string }) => formatCardCode(c.code)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (created && created.length > 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="font-medium text-emerald-900 mb-1">
            ✓ 已生成 {created.length} 张卡密
          </div>
          <div className="text-sm text-emerald-700">
            请妥善保存,关闭页面后无法再次查看完整卡密
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 max-h-96 overflow-y-auto">
          <div className="space-y-1.5 font-mono text-sm">
            {created.map((code, i) => (
              <div key={i} className="text-indigo-700 tracking-wider">
                {code}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(created.join("\n"));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              复制全部
            </button>
            {copied && (
              <span className="text-xs text-emerald-700 flex items-center gap-1">
                <span>✓</span>
                <span>已复制</span>
              </span>
            )}
          </div>
          {/* 下载 .txt:关闭页面后仍能找回卡密(浏览器下载的文件持久化) */}
          <button
            type="button"
            onClick={() => {
              const text = created.join("\n") + "\n";
              const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
              a.download = `card-keys-${ts}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            下载 .txt
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/cards")}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            返回列表
          </button>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setCount(10);
              setNotes("");
            }}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
          >
            再生成一批
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
    >
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">生成数量</label>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
          min={1}
          max={500}
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <p className="text-xs text-slate-500 mt-1.5">最多 500 张/批</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          备注 <span className="text-slate-400 font-normal">(可选)</span>
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="如：第一批 / 给某分销商 / 双十一活动"
          maxLength={100}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          批次或来源标识,可在卡密列表搜索。例:【2026-01-微信群】【线下活动3月】
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "生成中..." : "生成"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/cards")}
          className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
        >
          取消
        </button>
      </div>
    </form>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCardCode } from "@/lib/card-key";
import { normalizePhone } from "@/lib/phone";

type Mode = "bound" | "unbound";

export function NewCardClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("bound");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activatedAt, setActivatedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [count, setCount] = useState(10);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string[] | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setCreated(null);
    try {
      const payload: Record<string, unknown> = { mode, notes: notes || undefined };
      if (mode === "bound") {
        payload.phoneNumber = phoneNumber;
        payload.activatedAt = activatedAt;
      } else {
        payload.count = count;
      }
      const resp = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(created.join("\n"));
              alert("已复制全部卡密到剪贴板");
            }}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            复制全部
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
              setPhoneNumber("");
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
        <label className="block text-sm font-medium mb-1.5">卡密类型</label>
        <div className="grid grid-cols-2 gap-2">
          <ModeOption
            selected={mode === "bound"}
            onClick={() => setMode("bound")}
            title="已绑定"
            desc="需要填写手机号+激活日期"
          />
          <ModeOption
            selected={mode === "unbound"}
            onClick={() => setMode("unbound")}
            title="空模板"
            desc="批量生成,兑换时填写"
          />
        </div>
      </div>

      {mode === "bound" ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">手机号</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="07724215611"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              归一化后存: {normalizePhone(phoneNumber) || "—"}
            </p>
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
        </>
      ) : (
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
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">
          备注 <span className="text-slate-400 font-normal">(可选)</span>
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="如: ¥60 档 / 第一批 / 给某分销商"
          maxLength={100}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
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

function ModeOption({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-all ${
        selected
          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
    >
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
    </button>
  );
}
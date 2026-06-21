"use client";

import { useState } from "react";

const DEFAULT = `【Giffgaff 报号提醒】您的号码 {{phone}} 已激活 {{days}} 天，该报号啦！
点击更新保号时间：{{port_url}}`;

export default function SettingsForm({ initial }: { initial: string }) {
  const [template, setTemplate] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const resp = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <label className="block text-sm font-medium mb-2">提醒文案模板</label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={6}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <div className="mt-2 text-xs text-slate-500 space-y-0.5">
          <p>可用变量：</p>
          <ul className="list-disc list-inside pl-2 space-y-0.5">
            <li><code className="bg-slate-100 px-1 rounded">{"{{phone}}"}</code> — 完整手机号</li>
            <li><code className="bg-slate-100 px-1 rounded">{"{{days}}"}</code> — 当前 day_offset</li>
            <li><code className="bg-slate-100 px-1 rounded">{"{{port_url}}"}</code> — 保号更新链接</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          已保存
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={() => setTemplate(DEFAULT)}
          className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { renderTemplate } from "@/lib/template";

const DEFAULT = `【Giffgaff 保号提醒】您的号码 {{phone}} 已激活 {{days}} 天，该保号啦！
点击更新保号时间：{{port_url}}`;

// 预览用的样例值
const SAMPLE = {
  phone: "07724 215611",
  days: 175,
  port_url: "https://baohao.681218.xyz/p/42",
};

export default function SettingsForm({ initial }: { initial: string }) {
  const [template, setTemplate] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // T5:检测"未保存"状态 — template 跟 initial 不同,且没在保存
  const dirty = template !== initial;

  // 实时预览(纯前端,不发请求)
  const previewBody = useMemo(
    () =>
      renderTemplate(template, {
        phone: SAMPLE.phone,
        days: SAMPLE.days,
        port_url: SAMPLE.port_url,
      }),
    [template]
  );

  // 检测模板里是否引用了未知变量(仅 {{phone}} {{days}} {{port_url}} 是合法的)
  const unknownVars = useMemo(() => {
    const known = new Set(["phone", "days", "port_url"]);
    const matches = template.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) ?? [];
    const found = new Set<string>();
    for (const m of matches) {
      const name = m.replace(/[{}\s]/g, "");
      if (!known.has(name)) found.add(name);
    }
    return Array.from(found);
  }, [template]);

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

  const onRestoreDefault = () => {
    if (
      template !== DEFAULT &&
      !confirm("确认恢复默认模板?当前编辑的内容会被覆盖。")
    ) {
      return;
    }
    setTemplate(DEFAULT);
  };

  // T3:点击变量按钮 → 在 textarea 光标位置插入
  const insertAtCursor = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      // 兜底:直接 append
      setTemplate((t) => t + snippet);
      return;
    }
    const start = ta.selectionStart ?? template.length;
    const end = ta.selectionEnd ?? template.length;
    const next = template.slice(0, start) + snippet + template.slice(end);
    setTemplate(next);
    // 重新聚焦 + 把光标移过插入的 snippet
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <label className="block text-sm font-medium mb-2">提醒文案模板</label>
      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        ref={textareaRef}
        rows={10}
        spellCheck={false}
        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
      />
      {dirty && (
        <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
            aria-hidden="true"
          />
          有未保存的修改
        </p>
      )}
        <div className="mt-2 text-xs text-slate-500 space-y-0.5">
          <p>可用变量(点击按钮插入到光标位置):</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <button
              type="button"
              onClick={() => insertAtCursor("{{phone}}")}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs"
            >
              {"{{phone}}"}
            </button>
            <button
              type="button"
              onClick={() => insertAtCursor("{{days}}")}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs"
            >
              {"{{days}}"}
            </button>
            <button
              type="button"
              onClick={() => insertAtCursor("{{port_url}}")}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs"
            >
              {"{{port_url}}"}
            </button>
          </div>
        </div>

        {unknownVars.length > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            ⚠️ 检测到未识别的变量:{unknownVars.map((v) => `{{${v}}}`).join(", ")}。
            这些变量不会被替换,会原样输出。
          </div>
        )}
      </div>

      {/* 实时预览 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">预览（用样例数据渲染）</h3>
          <span className="text-xs text-slate-400">
            样例：phone={SAMPLE.phone}, days={SAMPLE.days}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">推送标题</div>
          <div className="font-medium text-slate-900 mb-3">Giffgaff 保号提醒</div>
          <div className="text-xs text-slate-500 mb-1">推送正文</div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 break-words">
            {previewBody}
          </pre>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          上方是用户在 Sever酱 / Bark 等渠道实际收到的内容。修改左侧模板,右侧实时更新。
        </p>
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
          onClick={onRestoreDefault}
          className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingButton } from "@/app/_components/loading-button";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ input: string; reason: string }>;
}

export function ImportCardClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // 解析用户输入的卡密:支持纯文本(每行一个)、CSV、JSON 数组、混合带分隔符
  const parsed = (() => {
    const t = text.trim();
    if (!t) return { codes: [] as string[], total: 0, dedupCount: 0 };
    // 尝试 JSON 数组
    if (t.startsWith("[")) {
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) {
          const codes = arr
            .map((x) => String(x))
            .filter((x) => x.length > 0);
          return { codes, total: codes.length, dedupCount: codes.length };
        }
      } catch {
        // 继续尝试其他格式
      }
    }
    // 按空白/逗号/分号/换行/竖线分隔
    const parts = t.split(/[\s,;|\t]+/).filter((p) => p.length > 0);
    return { codes: parts, total: parts.length, dedupCount: parts.length };
  })();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (parsed.codes.length === 0) {
      setError("请输入至少 1 个卡密");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/cards/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codes: parsed.codes,
          notes: notes || undefined,
        }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "导入失败");
        return;
      }
      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="font-medium text-emerald-900 mb-1 inline-flex items-center gap-1.5">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            导入完成
          </div>
          <div className="text-sm text-emerald-700 space-y-1">
            <div>
              新导入: <strong>{result.imported}</strong> 张
            </div>
            {result.skipped > 0 && (
              <div>
                跳过(已在库): <strong>{result.skipped}</strong> 张
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                格式错误: <strong>{result.errors.length}</strong> 个
              </div>
            )}
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="bg-white border border-rose-200 rounded-lg p-4 max-h-72 overflow-y-auto">
            <div className="text-sm font-medium text-rose-900 mb-2">
              错误明细
            </div>
            <ul className="text-xs space-y-1 font-mono">
              {result.errors.map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-400 shrink-0">#{i + 1}</span>
                  <span className="text-slate-700 break-all">{e.input || "(空)"}</span>
                  <span className="text-rose-600 shrink-0">— {e.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Link
            href="/admin/cards"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            返回列表
          </Link>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setText("");
              setNotes("");
            }}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
          >
            再导一批
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
        <label className="block text-sm font-medium mb-1.5">卡密列表</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`每行一个,或用空格/逗号/分号/竖线/换行分隔。例:\nXXXX-XXXX-XXXX-XXXX\nYYYY YYYY YYYY YYYY\n["ZZZZ-ZZZZ-ZZZZ-ZZZZ","WWWWWWWWWWWWWWWW"]`}
          rows={10}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <p className="text-xs text-slate-500 mt-1.5 flex items-center justify-between flex-wrap gap-2">
          <span>
            解析为 <strong className="text-slate-700">{parsed.codes.length}</strong> 个卡密
            {parsed.codes.length > 0 && " (自动去分隔符,大小写归一)"}
          </span>
          <span>单次最多 1000 张</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          批次备注 <span className="text-slate-400 font-normal">(可选)</span>
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="如：XX分销商-3月批发 / 内部测试"
          maxLength={200}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          用于在卡密列表搜索。例：【XX-3月】【批发-50张】
        </p>
      </div>

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          loading={loading}
          loadingLabel="导入中"
          label="开始导入"
          tone="primary"
          className="px-4 py-2 text-sm"
        />
        <Link
          href="/admin/cards"
          className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
        >
          取消
        </Link>
      </div>

      <details className="pt-3 border-t border-slate-100">
        <summary className="text-xs text-slate-500 cursor-pointer list-none flex items-center gap-1.5">
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          支持的输入格式
        </summary>
        <ul className="mt-2 text-xs text-slate-600 space-y-1 ml-4 list-disc">
          <li>每行一个卡密（最常用）</li>
          <li>用空格 / 逗号 / 分号 / 竖线 / Tab 分隔</li>
          <li>JSON 数组格式: <code className="font-mono">{`["AAA-AAA-AAA-AAA", ...]`}</code></li>
          <li>带不带 <code className="font-mono">-</code> 横线都可以（自动归一化）</li>
          <li>大小写不敏感（自动转大写）</li>
          <li>已存在的卡密自动跳过,不报错</li>
        </ul>
      </details>
    </form>
  );
}

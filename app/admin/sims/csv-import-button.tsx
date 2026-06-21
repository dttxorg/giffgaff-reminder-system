"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CsvImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const onImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch("/api/admin/sims/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setResult({ inserted: 0, updated: 0, errors: [data.error || "导入失败"] });
        return;
      }
      setResult({ inserted: data.inserted, updated: data.updated, errors: data.errors || [] });
      if (data.inserted + data.updated > 0) router.refresh();
    } catch (e) {
      setResult({ inserted: 0, updated: 0, errors: [e instanceof Error ? e.message : "网络错误"] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
      >
        CSV 导入
      </button>

      {open && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">CSV 导入</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-3 text-sm text-slate-600">
              <p className="mb-2">
                格式：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">phone_number,activated_at</code>
              </p>
              <p className="text-xs text-slate-500">
                phone_number 只含数字，activated_at 格式 YYYY-MM-DD。已存在的号码会更新激活日期。
              </p>
            </div>

            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={`phone_number,activated_at
07724215611,2026-01-15
07724215612,2026-01-16`}
              rows={10}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />

            {result && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 text-sm">
                <div>新增: {result.inserted}，更新: {result.updated}</div>
                {result.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-rose-600">
                      {result.errors.length} 条错误
                    </summary>
                    <ul className="mt-1 text-xs text-slate-600 space-y-0.5">
                      {result.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setOpen(false);
                  setResult(null);
                }}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
              >
                关闭
              </button>
              <button
                onClick={onImport}
                disabled={loading || !csv.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "导入中..." : "开始导入"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

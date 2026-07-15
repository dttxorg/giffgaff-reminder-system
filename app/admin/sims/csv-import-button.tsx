"use client";

import { useId, useState } from "react";
import { LoadingButton } from "@/app/_components/loading-button";
import { useRouter } from "next/navigation";

export function CsvImportButton() {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const rowCount = csv
    .split(/\r?\n/)
    .filter((line) => line.trim() && !/^phone/i.test(line.trim())).length;

  const closeModal = () => {
    if (loading) return;
    setOpen(false);
    setResult(null);
  };

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
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        CSV 导入
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id={titleId} className="text-xl font-bold">CSV 导入</h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                aria-label="关闭 CSV 导入"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait disabled:opacity-40"
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
              aria-label="CSV 内容"
              disabled={loading}
              autoFocus
              placeholder={`phone_number,activated_at
07724215611,2026-01-15
07724215612,2026-01-16`}
              rows={10}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 sm:text-xs"
            />

            {loading && (
              <div
                className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900"
                role="status"
                aria-live="polite"
              >
                正在校验并导入 {rowCount} 行数据，请保持此窗口打开…
              </div>
            )}

            {result && (
              <div
                className={`mt-3 rounded-lg border p-3 text-sm ${
                  result.errors.length === 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : result.inserted + result.updated > 0
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
                role={result.errors.length > 0 ? "alert" : "status"}
                aria-live="polite"
              >
                <div className="font-medium">
                  导入完成：新增 {result.inserted}，更新 {result.updated}
                </div>
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
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="min-h-11 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50"
              >
                关闭
              </button>
              <LoadingButton
                onClick={onImport}
                loading={loading}
                loadingLabel="导入中"
                label="开始导入"
                tone="primary"
                disabled={!csv.trim()}
                className="min-h-11 px-4 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

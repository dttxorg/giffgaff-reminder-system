"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Spinner } from "@/app/_components/skip-to-content";
import { formatCardCode } from "@/lib/card-key";
import { todayLocalISODate } from "@/lib/date";
import {
  MAX_BATCH_REDEEM_ITEMS,
  parseBatchRedeemText,
  serializeBatchRedeemItems,
  type BatchRedeemItem,
} from "@/lib/redeem-batch";
import { formatPhoneForDisplay } from "@/lib/phone";

type BatchApiResultItem =
  | { index: number; ok: true; simId: number }
  | { index: number; ok: false; error: string };

interface BatchResult {
  total: number;
  redeemed: number;
  failed: number;
  items: BatchRedeemItem[];
  results: BatchApiResultItem[];
}

interface BatchRedeemPanelProps {
  sessionReady: boolean;
  isLoggedIn: boolean;
  existingSimCount: number;
  onSingle: () => void;
  onStepChange: (step: 1 | 2 | 3) => void;
}

const EXAMPLE_TEXT = `7K9P-3R4M-8H2X-N5YQ,07724215611,2026-07-01
8W3R-K2NP-9X5T-M7QH,07724215612,2026-07-08`;

export function BatchRedeemPanel({
  sessionReady,
  isLoggedIn,
  existingSimCount,
  onSingle,
  onStepChange,
}: BatchRedeemPanelProps) {
  const [text, setText] = useState("");
  const [defaultDate, setDefaultDate] = useState(() => todayLocalISODate());
  const [carrier, setCarrier] = useState<"giffgaff" | "ctexcel">("giffgaff");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);

  const parsed = useMemo(
    () => parseBatchRedeemText(text, defaultDate),
    [defaultDate, text]
  );
  const hasBlockingIssues =
    parsed.errors.length > 0 || parsed.overflow > 0;
  const canSubmit =
    sessionReady &&
    isLoggedIn &&
    parsed.items.length > 0 &&
    !hasBlockingIssues &&
    !loading;

  if (!sessionReady) {
    return (
      <div className="py-12 text-center" role="status">
        <Spinner size={20} label="正在确认账号状态" />
        <p className="mt-3 text-sm text-slate-600">
          批量导入会把多张 SIM 卡绑定到同一个账号
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-5 py-2">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="mb-2 flex items-center gap-2 font-semibold text-indigo-950">
            <StackIcon />
            批量导入需要先登录
          </div>
          <p className="text-sm leading-6 text-indigo-800">
            多张兑换码会统一绑定到当前账号。已有账号请先登录；第一次使用请先完成一张兑换创建账号。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            登录已有账号
          </Link>
          <button
            type="button"
            onClick={onSingle}
            className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            先兑换一张
          </button>
        </div>
      </div>
    );
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 256 * 1024) {
      setError("文件过大，请选择不超过 256 KB 的 CSV 或 TXT 文件");
      return;
    }
    try {
      const content = await file.text();
      setText(content);
      setFileName(file.name);
      setResult(null);
      onStepChange(1);
    } catch {
      setError("文件读取失败，请重新选择");
    }
  }

  async function submitBatch() {
    if (!canSubmit) return;
    const submittedItems = parsed.items;
    setLoading(true);
    setError(null);
    onStepChange(2);
    try {
      const response = await fetch("/api/redeem/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: submittedItems.map(({ code, phoneNumber, activatedAt }) => ({
            code,
            phoneNumber,
            activatedAt,
            carrier,
          })),
        }),
      });
      const data = await response.json();
      if (!data.ok) {
        setError(data.error || "批量兑换失败");
        onStepChange(1);
        return;
      }
      setResult({
        total: data.total,
        redeemed: data.redeemed,
        failed: data.failed,
        results: data.results,
        items: submittedItems,
      });
      onStepChange(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "网络错误");
      onStepChange(1);
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setText("");
    setFileName("");
    setResult(null);
    setError(null);
    onStepChange(1);
  }

  function retryFailed() {
    if (!result) return;
    const failed = result.results
      .filter(
        (entry): entry is Extract<BatchApiResultItem, { ok: false }> =>
          !entry.ok
      )
      .map((entry) => result.items[entry.index])
      .filter((item): item is BatchRedeemItem => Boolean(item));
    setText(serializeBatchRedeemItems(failed));
    setFileName("");
    setResult(null);
    setError(null);
    onStepChange(1);
  }

  if (result) {
    return (
      <BatchResultView
        result={result}
        existingSimCount={existingSimCount}
        onRetryFailed={retryFailed}
        onStartOver={startOver}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <StackIcon />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">
              一次最多绑定 {MAX_BATCH_REDEEM_ITEMS} 张 SIM 卡
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              每行填写“兑换码、手机号、激活日期”。省略日期时使用下方统一日期，成功与失败会逐行反馈。
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="batch-redeem-data" className="text-sm font-medium">
              批量数据
            </label>
            <label className="cursor-pointer text-xs font-medium text-indigo-700 hover:text-indigo-800">
              选择 CSV / TXT
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="sr-only"
                aria-label="选择批量兑换文件"
                disabled={loading}
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <textarea
            id="batch-redeem-data"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFileName("");
              setResult(null);
              setError(null);
              onStepChange(1);
            }}
            placeholder={`每行一张，例如：\n${EXAMPLE_TEXT}`}
            rows={9}
            disabled={loading}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 font-mono text-base leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {fileName
                ? `已读取 ${fileName}`
                : "支持逗号、中文逗号、分号、竖线或 Tab 分隔"}
            </span>
            {!text.trim() && (
              <button
                type="button"
                onClick={() => setText(EXAMPLE_TEXT)}
                className="font-medium text-indigo-700 hover:text-indigo-800"
              >
                填入示例
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="batch-carrier" className="mb-1.5 block text-sm font-medium">
              统一运营商预设
            </label>
            <select
              id="batch-carrier"
              value={carrier}
              onChange={(event) =>
                setCarrier(event.target.value as "giffgaff" | "ctexcel")
              }
              disabled={loading}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="giffgaff">Giffgaff · 170 / 180 天</option>
              <option value="ctexcel">CTExcel · 85 / 90 天 · 首日 3 次</option>
            </select>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              本次导入统一使用该预设，之后每个号码都可单独调整。
            </p>
          </div>

          <div>
            <label
              htmlFor="batch-default-date"
              className="mb-1.5 block text-sm font-medium"
            >
              统一激活日期
            </label>
            <input
              id="batch-default-date"
              type="date"
              value={defaultDate}
              onChange={(event) => setDefaultDate(event.target.value)}
              disabled={loading}
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              仅用于没有填写第三列日期的行。
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs leading-5 text-slate-600">
            <strong className="block text-sm text-slate-800">文件格式</strong>
            <code className="mt-1 block break-all font-mono text-[11px] text-slate-600">
              兑换码,手机号,YYYY-MM-DD
            </code>
            <span className="mt-1 block">可保留第一行表头。</span>
          </div>
        </div>
      </div>

      {text.trim() && (
        <BatchPreview
          items={parsed.items}
          errors={parsed.errors}
          totalRows={parsed.totalRows}
          overflow={parsed.overflow}
        />
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onSingle}
          disabled={loading}
          className="min-h-11 rounded-lg px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          返回单张兑换
        </button>
        <button
          type="button"
          onClick={() => void submitBatch()}
          disabled={!canSubmit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {loading && <Spinner size={16} label="批量兑换中" />}
          {loading
            ? `正在兑换 ${parsed.items.length} 张`
            : `确认导入 ${parsed.items.length} 张`}
        </button>
      </div>
    </div>
  );
}

function BatchPreview({
  items,
  errors,
  totalRows,
  overflow,
}: {
  items: BatchRedeemItem[];
  errors: Array<{ line: number; reason: string }>;
  totalRows: number;
  overflow: number;
}) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200"
      aria-label="批量数据预览"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">导入预览</div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
            共 {totalRows} 行
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
            可导入 {items.length}
          </span>
          {(errors.length > 0 || overflow > 0) && (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">
              需修改 {errors.length + overflow}
            </span>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="max-h-72 overflow-y-auto">
          <div className="hidden grid-cols-[3rem_minmax(0,1.35fr)_minmax(0,1fr)_9rem] gap-3 border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 sm:grid">
            <span>行</span>
            <span>兑换码</span>
            <span>手机号</span>
            <span>激活日期</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li
                key={`${item.line}-${item.code}`}
                className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[3rem_minmax(0,1.35fr)_minmax(0,1fr)_9rem] sm:items-center sm:gap-3"
              >
                <span className="text-xs text-slate-400">#{item.line}</span>
                <span className="break-all font-mono text-slate-800">
                  {formatCardCode(item.code)}
                </span>
                <span className="font-mono text-slate-700">
                  {formatPhoneForDisplay(item.phoneNumber)}
                </span>
                <span className="text-slate-600">{item.activatedAt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(errors.length > 0 || overflow > 0) && (
        <div className="border-t border-rose-100 bg-rose-50 px-4 py-3">
          <div className="mb-1.5 text-xs font-semibold text-rose-900">
            请修正后再导入
          </div>
          <ul className="space-y-1 text-xs text-rose-800">
            {errors.map((entry) => (
              <li key={`${entry.line}-${entry.reason}`}>
                第 {entry.line} 行：{entry.reason}
              </li>
            ))}
            {overflow > 0 && (
              <li>
                超出单次 {MAX_BATCH_REDEEM_ITEMS} 条限制：还有 {overflow} 行
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function BatchResultView({
  result,
  existingSimCount,
  onRetryFailed,
  onStartOver,
}: {
  result: BatchResult;
  existingSimCount: number;
  onRetryFailed: () => void;
  onStartOver: () => void;
}) {
  return (
    <div className="space-y-5">
      <div
        className={`rounded-xl border p-5 ${
          result.failed === 0
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
        role="status"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
              result.failed === 0 ? "bg-emerald-600" : "bg-amber-600"
            }`}
          >
            {result.failed === 0 ? <CheckIcon /> : <StackIcon />}
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {result.failed === 0 ? "批量兑换完成" : "批量兑换已处理"}
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              成功绑定 <strong>{result.redeemed}</strong> 张，失败{" "}
              <strong>{result.failed}</strong> 张。账号现在共有约{" "}
              <strong>{existingSimCount + result.redeemed}</strong> 张 SIM 卡。
            </p>
          </div>
        </div>
      </div>

      <section
        className="overflow-hidden rounded-xl border border-slate-200"
        aria-label="批量兑换结果"
      >
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-center text-xs">
          <div className="px-3 py-3">
            <strong className="block text-lg text-slate-900">{result.total}</strong>
            已处理
          </div>
          <div className="border-x border-slate-200 px-3 py-3 text-emerald-700">
            <strong className="block text-lg">{result.redeemed}</strong>
            成功
          </div>
          <div className="px-3 py-3 text-rose-700">
            <strong className="block text-lg">{result.failed}</strong>
            失败
          </div>
        </div>
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {result.results.map((entry) => {
            const item = result.items[entry.index];
            if (!item) return null;
            return (
              <li
                key={entry.index}
                className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_minmax(7rem,auto)] sm:items-center"
              >
                <span className="text-xs text-slate-400">#{item.line}</span>
                <span className="break-all font-mono text-slate-800">
                  {formatCardCode(item.code)}
                </span>
                <span className="font-mono text-slate-600">
                  {formatPhoneForDisplay(item.phoneNumber)}
                </span>
                <span
                  className={
                    entry.ok
                      ? "font-medium text-emerald-700"
                      : "text-rose-700"
                  }
                >
                  {entry.ok ? "绑定成功" : entry.error}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/me"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          查看我的号码
        </Link>
        {result.failed > 0 && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            重新处理失败项
          </button>
        )}
        <button
          type="button"
          onClick={onStartOver}
          className="min-h-11 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          再导入一批
        </button>
      </div>
    </div>
  );
}

function StackIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

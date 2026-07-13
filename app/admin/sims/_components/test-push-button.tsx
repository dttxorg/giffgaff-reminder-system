"use client";

// Round 131: 单个 sim 测试推送按钮
// - 用于 /admin/sims/[id] 详情页
// - 复用 /api/admin/sims/test-push (body: { simIds: [id] })
// - 用 ConfirmModal (round 127) 二次确认,避免误触
// - 只对已绑定 (有 user) 的 sim 显示;未绑 sim 给提示

import { useState } from "react";
import { ConfirmModal } from "@/app/_components/confirm-modal";

type PushResult = {
  ok: boolean;
  error?: string;
};

interface TestPushButtonProps {
  simId: number;
  /** null = sim 未绑定 user,没渠道可推 */
  isBound: boolean;
}

export function TestPushButton({ simId, isBound }: TestPushButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  if (!isBound) {
    return (
      <span
        className="text-xs text-slate-400 cursor-help"
        title="该号码未绑定用户,没有可推送的渠道"
      >
        未绑定,无法测试推送
      </span>
    );
  }

  const handleConfirm = async () => {
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch("/api/admin/sims/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simIds: [simId] }),
      });
      const data = (await resp.json()) as {
        ok: boolean;
        results?: Array<{ ok: boolean; error?: string }>;
        error?: string;
      };
      if (data.ok && data.results && data.results[0]) {
        setResult({ ok: data.results[0].ok, error: data.results[0].error });
      } else {
        setResult({ ok: false, error: data.error || "推送失败" });
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "网络错误",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 inline-flex items-center gap-1.5"
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        测试推送
      </button>

      <ConfirmModal
        open={open}
        title="发送测试推送?"
        description={
          <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
            <li>该 sim 绑定的用户会立刻收到一条测试消息</li>
            <li>会消耗对应渠道的当日推送配额(Sever酱 免费 5 条/天)</li>
            <li>用于排查渠道是否配置正确</li>
          </ul>
        }
        confirmLabel={loading ? "发送中..." : "发送测试推送"}
        loading={loading}
        onConfirm={handleConfirm}
        onClose={() => {
          if (!loading) {
            setOpen(false);
            setResult(null);
          }
        }}
      />

      {result && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            result.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {result.ok ? "✓ 推送成功,用户已收到测试消息" : `✗ 推送失败:${result.error}`}
        </div>
      )}
    </>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/app/_components/confirm-modal";

interface ResendButtonProps {
  reminderId: number;
}

export function ResendButton({ reminderId }: ResendButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const onConfirm = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const resp = await fetch(`/api/admin/reminders/${reminderId}/resend`, {
        method: "POST",
      });
      const data = await resp.json();
      if (!data.ok) {
        setMessage({ kind: "error", text: data.error || "重发失败" });
        setLoading(false);
        return;
      }
      setMessage({ kind: "success", text: "已发送" });
      setOpen(false);
      setLoading(false);
      router.refresh();
    } catch (e) {
      setMessage({
        kind: "error",
        text: e instanceof Error ? e.message : "网络错误",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="text-indigo-600 hover:underline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        重发
      </button>
      {message && (
        <span
          className={`text-xs ${
            message.kind === "success" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {message.text}
        </span>
      )}
      <ConfirmModal
        open={open}
        title="确认重发这条提醒?"
        confirmLabel="重发"
        tone="primary"
        loading={loading}
        onConfirm={onConfirm}
        onClose={() => {
          if (loading) return;
          setOpen(false);
        }}
        description={
          <>
            <p>将按当前 sim 状态重新渲染模板并推送给绑定渠道。</p>
            <ul className="list-disc list-inside text-slate-600">
              <li>不会影响其他 sim 的提醒计划</li>
              <li>会消耗绑定渠道的当日推送配额</li>
              <li>本次发送会作为新记录写入 reminders_sent</li>
            </ul>
          </>
        }
      />
    </div>
  );
}
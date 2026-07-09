"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ResendButtonProps {
  reminderId: number;
}

export function ResendButton({ reminderId }: ResendButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const onClick = async () => {
    if (loading) return;
    if (!confirm("确认重发这条提醒?将按当前 sim 状态重新渲染模板并推送给绑定渠道。")) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const resp = await fetch(`/api/admin/reminders/${reminderId}/resend`, {
        method: "POST",
      });
      const data = await resp.json();
      if (!data.ok) {
        setMessage({ kind: "error", text: data.error || "重发失败" });
        return;
      }
      setMessage({ kind: "success", text: "已发送" });
      router.refresh();
    } catch (e) {
      setMessage({
        kind: "error",
        text: e instanceof Error ? e.message : "网络错误",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="text-indigo-600 hover:underline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "发送中..." : "重发"}
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
    </div>
  );
}

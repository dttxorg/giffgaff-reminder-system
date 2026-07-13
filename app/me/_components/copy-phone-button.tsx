"use client";

import { useState } from "react";

/**
 * 复制完整手机号按钮
 * - 默认只显示 "复制" 图标,点了变 "✓"
 * - 2 秒后恢复
 * - 失败时降级到 textarea + execCommand
 */
export function CopyPhoneButton({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = phone;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`复制完整手机号 ${phone}`}
      className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 min-h-[44px] -ml-1 px-1"
    >
      {copied ? (
        <>
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>已复制</span>
        </>
      ) : (
        <>
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
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>复制完整号码</span>
        </>
      )}
    </button>
  );
}

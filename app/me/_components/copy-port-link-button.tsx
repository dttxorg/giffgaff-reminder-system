"use client";

import { useState } from "react";

/**
 * 复制保号页公开链接按钮
 *
 * 给客户/家人/朋友的 /p/{token} URL,带 clipboard + execCommand fallback。
 * URL 是绝对地址(从当前 origin 拼),保证可分享给任何设备。
 */
export function CopyPortLinkButton({ portUrl }: { portUrl: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(portUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = portUrl;
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
      aria-label="复制保号链接"
      className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
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
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>复制保号链接</span>
        </>
      )}
    </button>
  );
}

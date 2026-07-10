"use client";

import { useState } from "react";

interface CopyCodeButtonProps {
  code: string;
}

/**
 * 单条卡密复制按钮:点击后变 "✓ 已复制" 2 秒
 */
export function CopyCodeButton({ code }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: 用旧的 execCommand
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        // execCommand 返回 boolean:true = 成功,false = 失败
        const ok = document.execCommand("copy");
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch {
        // 复制不了,用户只能手动选中
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
      aria-label={`复制卡密 ${code}`}
    >
      {copied ? (
        <span className="inline-flex items-center gap-1">
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
          已复制
        </span>
      ) : (
        "复制"
      )}
    </button>
  );
}

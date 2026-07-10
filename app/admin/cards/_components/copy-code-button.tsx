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
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
      {copied ? "✓ 已复制" : "复制"}
    </button>
  );
}

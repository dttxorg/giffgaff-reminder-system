"use client";

// Round 133: 共享 LoadingButton
// - loading=true 时显示 Spinner + 文本
// - loading=true 时禁用按钮(disabled)
// - 跟现有按钮配色兼容(默认 indigo-600,支持 primary/danger 两种 tone)

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./skip-to-content";

type Tone = "primary" | "danger";

interface LoadingButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** 加载中状态 */
  loading?: boolean;
  /** 加载时显示的文本(默认 "处理中") */
  loadingLabel?: string;
  /** 静态文本 */
  label: string;
  /** 按钮色调 (默认 primary=indigo) */
  tone?: Tone;
  /** 图标(可选,放在文本前) */
  icon?: ReactNode;
}

/**
 * 内联 button + loading spinner 的共享组件。
 *
 * 用法:
 *   <LoadingButton
 *     type="submit"
 *     loading={saving}
 *     loadingLabel="保存中"
 *     label="保存"
 *     tone="primary"
 *   />
 *
 * 之前 12+ 处用 {loading ? "X中..." : "X"} 写文案,现在统一走这个。
 */
export function LoadingButton({
  loading = false,
  loadingLabel = "处理中",
  label,
  tone = "primary",
  icon,
  type = "button",
  className,
  disabled,
  ...rest
}: LoadingButtonProps) {
  const toneClass =
    tone === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300"
      : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300";

  const isDisabled = loading || disabled;
  const effectiveLabel = loading ? loadingLabel : label;

  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed " +
        toneClass +
        (className ? " " + className : "")
      }
    >
      {loading && <Spinner size={14} className="text-current" label={loadingLabel} />}
      {icon && !loading && icon}
      <span>{effectiveLabel}</span>
    </button>
  );
}

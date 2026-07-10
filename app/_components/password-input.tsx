"use client";

import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  /** 自定义 className(覆盖默认) */
  className?: string;
  /** 输入框 id */
  id?: string;
  /** 输入框 name */
  name?: string;
  /** 是否处于验证失败状态(密码太短/两次不一致),边框变 rose */
  invalid?: boolean;
  /** aria-invalid 用于表单错误状态 */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * 密码输入框,带"显示密码"眼睛图标切换可见性。
 *
 * 设计:
 * - 默认 type="password" 不显示明文
 * - 右侧按钮点击后切到 type="text",图标变 Hide
 * - aria-label="显示密码"/"隐藏密码" 让屏幕阅读器读出意图
 * - 按钮紧贴输入框右侧,在输入框 border 内(不破坏边框)
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  className = "",
  id,
  name,
  invalid = false,
  ...aria
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        id={id}
        name={name}
        {...aria}
        className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border outline-none transition ${
              invalid
                ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            } font-mono ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "隐藏密码" : "显示密码"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700 transition-colors"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

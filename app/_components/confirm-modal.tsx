"use client";
import { useEffect, useRef, type ReactNode } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * 按钮色调:
   * - "primary": indigo (默认,普通确认)
   * - "danger":  rose   (删除/重置等破坏性操作)
   */
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 通用确认 Modal — 替代 window.confirm() / alert()
 *
 * 设计要点:
 * - a11y: role="dialog" + aria-modal + aria-labelledby 指向 title
 * - 键盘: Esc 关闭(loading 时不响应,避免提交中断)
 * - 遮罩点击关闭(loading 时不响应)
 * - 视觉与 me/settings/settings-client.tsx 的"修改激活日期"确认 Modal 对齐
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  tone = "primary",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const titleId = "confirm-modal-title";
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Esc 关闭 — loading 时不响应,避免用户在 fetch 中途打断
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loading, onClose]);

  // 打开时焦点移到确认按钮 — 便于键盘用户立即按 Enter 提交
  useEffect(() => {
    if (open) confirmBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "bg-indigo-600 text-white hover:bg-indigo-700";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className={`text-lg font-semibold mb-2 ${
            tone === "danger" ? "text-rose-700" : "text-slate-900"
          }`}
        >
          {title}
        </h2>
        {description && (
          <div className="text-sm text-slate-700 space-y-2">{description}</div>
        )}
        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {loading ? "处理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
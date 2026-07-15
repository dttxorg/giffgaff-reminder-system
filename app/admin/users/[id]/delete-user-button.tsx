"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/app/_components/loading-button";

interface DeleteUserButtonProps {
  userId: number;
  reminderCount: number;
}

/**
 * 危险操作:删除用户
 * - 用 modal 二次确认 + 要求输入用户 ID 防止误点
 * - 删除后会跳回 /admin/users 列表
 */
export function DeleteUserButton({ userId, reminderCount }: DeleteUserButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setConfirmId("");
    setError(null);
    setOpen(true);
  };
  const closeModal = () => {
    if (loading) return;
    setOpen(false);
  };

  const onSubmit = async () => {
    setError(null);
    if (confirmId !== String(userId)) {
      setError(`请输入正确的用户 ID(当前: ${userId})`);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "删除失败");
        return;
      }
      // 删完跳回列表
      router.push("/admin/users");
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-xs text-rose-600 hover:underline"
      >
        删除该用户
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-user-title"
              className="text-lg font-semibold text-rose-700 mb-2"
            >
              删除用户 #{userId}
            </h2>
            <p className="text-sm text-slate-700 mb-3">
              这是一个<strong>不可逆</strong>操作。删除后:
            </p>
            <ul className="text-sm text-slate-600 list-disc list-inside mb-3 space-y-1">
              <li>该用户账号立即失效,所有登录会话被清空</li>
              <li>{reminderCount} 条推送历史记录被永久删除</li>
              <li>绑定的 sim 号码<strong>保留</strong>(可被新用户兑换认领)</li>
            </ul>
            <p className="text-sm text-slate-700 mb-2">
              请输入用户 ID <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{userId}</code> 以确认:
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={confirmId}
              onChange={(e) => setConfirmId(e.target.value)}
              placeholder={String(userId)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-rose-700">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                取消
              </button>
              <LoadingButton
                type="button"
                onClick={onSubmit}
                loading={loading}
                loadingLabel="删除中"
                label="确认删除"
                tone="danger"
                disabled={confirmId !== String(userId)}
                className="px-4 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

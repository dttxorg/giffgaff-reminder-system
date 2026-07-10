"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/date";
import { generateSecurePassword } from "@/lib/password-gen";
import { EmptyState } from "@/app/_components/empty-state";

interface UserRow {
  id: number;
  simPhone: string;
  simLookupKey: string;
  channel: string;
  reminderCount: number;
  createdAt: string;
  hasPassword: boolean;
}

interface UsersClientProps {
  users: UserRow[];
}

export function UsersClient({ users }: UsersClientProps) {
  const router = useRouter();
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle"
  );
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const openReset = (id: number) => {
    setResettingId(id);
    setNewPassword("");
    setResetStatus("idle");
    setResetMessage(null);
    setGeneratedPassword(null);
  };

  const closeReset = () => {
    setResettingId(null);
    setNewPassword("");
    setResetStatus("idle");
    setResetMessage(null);
    setGeneratedPassword(null);
  };

  // Esc 关闭 modal — 与点击遮罩关闭一致的键盘可达性
  useEffect(() => {
    if (resettingId === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeReset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [resettingId]);

  const generatePassword = () => {
    // 使用 crypto.getRandomValues(CSPRNG),而非 Math.random,避免被预测
    setNewPassword(generateSecurePassword());
  };

  const onSubmit = async () => {
    if (resettingId === null || newPassword.length < 8) return;
    setResetStatus("saving");
    setResetMessage(null);
    try {
      const resp = await fetch(`/api/admin/users/${resettingId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setResetStatus("error");
        setResetMessage(data.error || "重置失败");
        return;
      }
      setResetStatus("success");
      setResetMessage("已重置。请把新密码告诉客户,本页面关闭后将不再显示。");
      // 一次性显示密码（不持久化到 state 太深，避免反复显示）
      setGeneratedPassword(newPassword);
      router.refresh();
    } catch (e) {
      setResetStatus("error");
      setResetMessage(e instanceof Error ? e.message : "网络错误");
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">绑定 sim</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">后 6 位</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">渠道</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">密码</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">提醒数</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">注册时间 (UTC)</th>
                <th className="text-left px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="还没有用户"
                      hint="新增号码时勾选'一并创建用户',或让客户用卡密兑换"
                    />
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 hidden md:table-cell">{u.id}</td>
                    <td className="px-3 py-2 font-mono">{u.simPhone}</td>
                    <td className="px-3 py-2 font-mono text-slate-500 hidden md:table-cell">{u.simLookupKey}</td>
                    <td className="px-3 py-2 hidden md:table-cell">{u.channel}</td>
                    <td className="px-3 py-2">
                      {u.hasPassword ? (
                        <span className="text-emerald-700 text-xs">✓ 已设</span>
                      ) : (
                        <span className="text-rose-700 text-xs">未设</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500 hidden md:table-cell">{u.reminderCount}</td>
                    <td className="px-3 py-2 text-xs hidden md:table-cell">
                      <div className="text-slate-700">{formatRelativeTime(u.createdAt)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.createdAt} UTC</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-indigo-600 hover:underline text-xs mr-3"
                      >
                        查看
                      </Link>
                      <button
                        onClick={() => openReset(u.id)}
                        className="text-indigo-600 hover:underline text-xs"
                      >
                        重置密码
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resettingId !== null && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-pwd-title"
          onClick={closeReset}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reset-pwd-title" className="text-lg font-semibold mb-1">重置用户密码</h2>
            <p className="text-xs text-slate-500 mb-4">
              用户 ID = {resettingId}。重置后请把新密码通过安全渠道告知客户。
            </p>

            {generatedPassword ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-sm font-medium text-emerald-900 mb-2">
                    ✓ 密码已重置
                  </div>
                  <div className="text-xs text-emerald-700 mb-2">
                    新密码（请复制后告知客户，关闭后不再显示）:
                  </div>
                  <div className="font-mono text-sm bg-white border border-emerald-300 rounded px-3 py-2 break-all">
                    {generatedPassword}
                  </div>
                </div>
                <button
                  onClick={closeReset}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  关闭
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    新密码
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="至少 8 位"
                      autoComplete="off"
                      minLength={8}
                      className={`flex-1 px-3.5 py-2.5 rounded-lg border font-mono outline-none ${
                        newPassword && newPassword.length < 8
                          ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 whitespace-nowrap"
                    >
                      随机生成
                    </button>
                  </div>
                  {newPassword && newPassword.length < 8 && (
                    <p className="text-xs text-rose-600 mt-1.5">
                      密码至少 8 位（当前 {newPassword.length} 位）
                    </p>
                  )}
                </div>

                {resetMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      resetStatus === "error"
                        ? "bg-rose-50 border border-rose-200 text-rose-700"
                        : "bg-slate-50 border border-slate-200 text-slate-600"
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={onSubmit}
                    disabled={
                      newPassword.length < 8 || resetStatus === "saving"
                    }
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {resetStatus === "saving" ? "重置中..." : "重置"}
                  </button>
                  <button
                    onClick={closeReset}
                    className="px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

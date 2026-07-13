"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/app/_components/loading-button";
import { generateSecurePassword } from "@/lib/password-gen";
import { ConfirmModal } from "@/app/_components/confirm-modal";

export default function NewSimPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activatedAt, setActivatedAt] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [initialPassword, setInitialPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (initialPassword.length < 8) {
      setError("初始密码至少 8 位");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, activatedAt, status, initialPassword }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      router.push("/admin/sims");
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    // 使用 crypto.getRandomValues(CSPRNG),而非 Math.random,避免被预测
    // N10:如果已经手输过密码,弹 modal 二次确认避免误点覆盖(尤其长密码)
    if (initialPassword) {
      setOverwriteOpen(true);
      return;
    }
    setInitialPassword(generateSecurePassword());
  };

  const confirmOverwrite = () => {
    setInitialPassword(generateSecurePassword());
    setOverwriteOpen(false);
  };

  return (
    <div className="p-6 sm:p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">新增号码</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">手机号</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="07724215611（只填数字）"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">激活日期</label>
          <input
            type="date"
            value={activatedAt}
            onChange={(e) => setActivatedAt(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">状态</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "paused")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 outline-none"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            客户初始登录密码
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              placeholder="至少 8 位"
              required
              minLength={8}
              autoComplete="off"
              className={`flex-1 px-3.5 py-2.5 rounded-lg border font-mono outline-none ${
                initialPassword && initialPassword.length < 8
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
          {initialPassword && initialPassword.length < 8 ? (
            <p className="text-xs text-rose-600 mt-1.5">
              密码至少 8 位（当前 {initialPassword.length} 位）
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1.5">
              请通过安全渠道（线下/加密消息）告知客户,客户首次登录后可在「设置」里自行修改
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="保存中"
            label="保存"
            tone="primary"
            className="px-4 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
          >
            取消
          </button>
        </div>
      </form>

      <ConfirmModal
        open={overwriteOpen}
        title="覆盖已输入的密码？"
        confirmLabel="覆盖"
        onConfirm={confirmOverwrite}
        onClose={() => setOverwriteOpen(false)}
        description={
          <p>
            已输入的密码会被新的随机密码覆盖。建议先复制当前密码再继续。
          </p>
        }
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { PasswordInput } from "@/app/_components/password-input";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [simNumber, setSimNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simNumber, password }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "登录失败");
        return;
      }
      // 如果用户还没设 channel,先去 /me 让它引导到 /me/settings
      router.push(data.redirect || "/me");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {/* 标题区:logo + 标题 + 副标题 */}
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-block w-10 h-10 rounded-lg bg-indigo-600 text-white text-center leading-10 text-lg font-bold">
            G
          </span>
          <h1 className="text-2xl font-bold">登录</h1>
        </div>
        <p className="text-slate-600 text-sm mb-6">
          输入您的 giffgaff 号码和登录密码。首次登录后会被引导设置通知渠道。
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <span aria-hidden="true" className="shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Giffgaff 号码
            </label>
            <input
              type="text"
              value={simNumber}
              onChange={(e) => setSimNumber(e.target.value)}
              placeholder="如 07724 215611"
              required
              autoComplete="off"
              inputMode="tel"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              支持带空格 / 横线,系统按后 6 位匹配
            </p>
          </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">登录密码</label>
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="您的登录密码（兑换时设置或管理员提供）"
            required
            autoComplete="current-password"
          />
        </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-700 mb-2">还没账号?3 步开通</p>
          <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
            <li>在 <Link href="/redeem" className="text-indigo-600 hover:underline font-medium">兑换页</Link> 填卡密 + 手机号 + 激活日期</li>
            <li>设置登录密码(至少 8 位)</li>
            <li>登录后绑定 Sever酱 / Bark / Telegram 任一推送渠道</li>
          </ol>
          <p className="text-xs text-slate-400 mt-3">
            没有卡密?请联系给您开通服务的销售方。
          </p>
        </div>
        <div className="mt-3 text-xs text-slate-500 text-center flex items-center justify-center gap-1">
          <span aria-hidden="true">🔑</span>
          <span>忘记密码请联系管理员重置</span>
        </div>
      </div>
    </div>
  );
}

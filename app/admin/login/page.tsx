"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingButton } from "@/app/_components/loading-button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, otp: otp || undefined }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "登录失败");
        return;
      }
      startNavigation(() => router.push(data.redirect || "/admin"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 py-12">
      {/* A6 修复:admin 登出后只剩这张卡片太孤岛,顶部加一个细窄的 context bar
          说明这是管理入口,旁边给一个"用户登录"出口,避免被困在 admin 这边。 */}
      <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between text-xs text-slate-500 max-w-3xl mx-auto">
        <span>
          <span className="inline-block w-5 h-5 rounded bg-slate-900 text-white text-center leading-5 mr-1.5 align-middle">
            A
          </span>
          <span className="align-middle">管理入口</span>
        </span>
        <Link href="/login" className="hover:text-indigo-600 transition-colors">
          去用户登录 →
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">管理员登录</h1>
        <p className="text-slate-600 text-sm mb-6">请输入管理员凭据与动态验证码</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-sm font-medium mb-1.5">账号</label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>
          <div>
            <label htmlFor="admin-otp" className="block text-sm font-medium mb-1.5">动态验证码</label>
            <input
              id="admin-otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              placeholder="6 位验证码"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium mb-1.5">密码</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>
          <LoadingButton
            type="submit"
            loading={loading || isNavigating}
            loadingLabel="登录中"
            label="登录"
            tone="primary"
            className="w-full py-2.5"
          />
        </form>

        <p className="mt-4 text-xs text-slate-500">
          管理员账号由部署环境预先配置，系统不会自动创建默认账号。
        </p>
        <div className="mt-3 text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

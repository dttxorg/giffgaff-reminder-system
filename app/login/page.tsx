"use client";

import { useState } from "react";
import { PasswordInput } from "@/app/_components/password-input";
import { Spinner } from "@/app/_components/skip-to-content";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "redeem";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [simNumber, setSimNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setError(null);
    setMode(next);
  };

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
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block w-10 h-10 rounded-lg bg-indigo-600 text-white text-center leading-10 text-lg font-bold">
            G
          </span>
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "登录" : "兑换卡密"}
          </h1>
        </div>

        {/* 两路径 tab 切换:让新卡密用户第一时间看到兑换入口(L1 修复) */}
        <div
          role="tablist"
          aria-label="登录方式"
          className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 mb-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => switchMode("login")}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            我有账号
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "redeem"}
            onClick={() => switchMode("redeem")}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === "redeem"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🎫 我有卡密
          </button>
        </div>

        {mode === "login" ? (
          <LoginForm
            simNumber={simNumber}
            setSimNumber={setSimNumber}
            password={password}
            setPassword={setPassword}
            error={error}
            loading={loading}
            onSubmit={onSubmit}
          />
        ) : (
          <RedeemPanel />
        )}

        <div className="mt-5 pt-5 border-t border-slate-100 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <span aria-hidden="true">🔑</span>
          <span>忘记密码请联系管理员重置</span>
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  simNumber,
  setSimNumber,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
}: {
  simNumber: string;
  setSimNumber: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <p className="text-slate-600 text-sm mb-5">
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
          <label className="block text-sm font-medium mb-1.5">Giffgaff 号码</label>
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
          // L4:disabled 时文字色也变浅(不只 opacity),色盲/弱视用户更易识别禁用
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner size={16} label="登录中" className="text-white" />
              <span>登录中...</span>
            </>
          ) : (
            "登录"
          )}
        </button>
      </form>
    </>
  );
}

function RedeemPanel() {
  return (
    <>
      <p className="text-slate-600 text-sm mb-5">
        第一次使用本系统?用销售方给您的 16 位卡密开通。
      </p>

      <ol className="space-y-2.5 text-sm text-slate-700 mb-5 list-decimal list-inside">
        <li>在兑换页填卡密 + 手机号 + 激活日期</li>
        <li>设置登录密码(至少 8 位)</li>
        <li>登录后绑定 Sever酱 / Bark / Telegram 任一推送渠道</li>
      </ol>

      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm mb-4">
        <div className="font-medium mb-1">📦 卡密长这样</div>
        <code className="font-mono text-xs">XXXX-XXXX-XXXX-XXXX</code>
        <span className="text-amber-700 ml-1">(16 位字母数字)</span>
      </div>

      <Link
        href="/redeem"
        className="block w-full text-center py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
      >
        去兑换页 →
      </Link>

      <p className="text-xs text-slate-400 mt-3 text-center">
        没有卡密?请联系给您开通服务的销售方。
      </p>
    </>
  );
}

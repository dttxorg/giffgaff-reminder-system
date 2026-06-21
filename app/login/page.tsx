"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Channel = "serverchan" | "bark";
type TestStatus = "idle" | "sending" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "code">("input");
  const [simNumber, setSimNumber] = useState("");
  const [channel, setChannel] = useState<Channel>("serverchan");
  const [channelKey, setChannelKey] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 测试推送状态
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const onTestPush = async () => {
    if (!channelKey.trim()) {
      setTestStatus("error");
      setTestMessage("请先填写渠道 Key");
      return;
    }
    if (cooldown > 0) return;
    setTestStatus("sending");
    setTestMessage(null);
    try {
      const resp = await fetch("/api/auth/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, channelKey }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setTestStatus("error");
        setTestMessage(data.error || "推送失败");
        // 429 时按后端提示的秒数倒计时
        if (resp.status === 429) {
          const match = (data.error || "").match(/(\d+)\s*秒/);
          if (match) startCooldown(parseInt(match[1], 10));
          else startCooldown(30);
        }
        return;
      }
      setTestStatus("success");
      setTestMessage(`已发送,请检查您的 ${channel === "serverchan" ? "Sever酱 微信" : "Bark App"}`);
      startCooldown(30);
    } catch (err) {
      setTestStatus("error");
      setTestMessage(err instanceof Error ? err.message : "网络错误");
    }
  };

  const onSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simNumber, channel, channelKey }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "发送失败");
        return;
      }
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simNumber, code }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "登录失败");
        return;
      }
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold mb-1">登录 / 绑定</h1>
        <p className="text-slate-600 text-sm mb-6">
          第一次使用会自动创建账号。再次登录会更新您的推送渠道。
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {step === "input" ? (
          <form onSubmit={onSendCode} className="space-y-4">
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
              <p className="text-xs text-slate-500 mt-1">
                支持带空格 / 横线,系统按后 6 位匹配
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">推送渠道</label>
              <div className="grid grid-cols-2 gap-2">
                <ChannelOption
                  value="serverchan"
                  selected={channel === "serverchan"}
                  onChange={() => setChannel("serverchan")}
                  title="Sever酱"
                  desc="微信公众号"
                />
                <ChannelOption
                  value="bark"
                  selected={channel === "bark"}
                  onChange={() => setChannel("bark")}
                  title="Bark"
                  desc="iOS / Android App"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                还没注册?查看
                {channel === "serverchan" ? (
                  <Link href="/help/serverchan" className="text-indigo-600 hover:underline ml-1">
                    Sever酱 教程
                  </Link>
                ) : (
                  <Link href="/help/bark" className="text-indigo-600 hover:underline ml-1">
                    Bark 教程
                  </Link>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {channel === "serverchan" ? "SendKey" : "Bark URL"}
              </label>
              <input
                type="text"
                value={channelKey}
                onChange={(e) => {
                  setChannelKey(e.target.value);
                  if (testStatus !== "idle") {
                    setTestStatus("idle");
                    setTestMessage(null);
                  }
                }}
                placeholder={channel === "serverchan" ? "SCT2xxxxxxxx" : "https://api.day.app/xxx"}
                required
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition font-mono text-sm"
              />

              {/* 测试推送按钮 + 状态 */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onTestPush}
                  disabled={testStatus === "sending" || cooldown > 0}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testStatus === "sending"
                    ? "发送中..."
                    : cooldown > 0
                    ? `请稍候 (${cooldown}s)`
                    : "测试推送"}
                </button>
                {testStatus === "success" && testMessage && (
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <span>✅</span>
                    <span>{testMessage}</span>
                  </span>
                )}
                {testStatus === "error" && testMessage && (
                  <span className="text-xs text-rose-700 flex items-center gap-1">
                    <span>❌</span>
                    <span>{testMessage}</span>
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "发送中..." : "发送验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="space-y-4">
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm text-indigo-900">
              验证码已发送到您的 {channel === "serverchan" ? "Sever酱 微信" : "Bark App"}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">验证码</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 位数字"
                required
                autoFocus
                autoComplete="one-time-code"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "验证中..." : "登录"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("input");
                setCode("");
                setError(null);
              }}
              className="w-full py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              返回修改号码
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChannelOption({
  value,
  selected,
  onChange,
  title,
  desc,
}: {
  value: Channel;
  selected: boolean;
  onChange: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`text-left p-3 rounded-lg border transition-all ${
        selected
          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
    >
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
    </button>
  );
}

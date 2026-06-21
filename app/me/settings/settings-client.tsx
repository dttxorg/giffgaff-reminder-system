"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Channel = "serverchan" | "bark";
type TestStatus = "idle" | "sending" | "success" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

interface MeSettingsClientProps {
  initialChannel: Channel;
  initialChannelKey: string;
  isFirstTime: boolean;
}

export function MeSettingsClient({
  initialChannel,
  initialChannelKey,
  isFirstTime,
}: MeSettingsClientProps) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [channelKey, setChannelKey] = useState(initialChannelKey);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(!isFirstTime && !!initialChannelKey);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
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

  const onTest = async () => {
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
        setVerified(false);
        if (resp.status === 429) {
          const match = (data.error || "").match(/(\d+)\s*秒/);
          if (match) startCooldown(parseInt(match[1], 10));
          else startCooldown(30);
        }
        return;
      }
      setTestStatus("success");
      setTestMessage(`已发送,请检查您的 ${channel === "serverchan" ? "Sever酱 微信" : "Bark App"}`);
      setVerified(true);
      startCooldown(30);
    } catch (err) {
      setTestStatus("error");
      setTestMessage(err instanceof Error ? err.message : "网络错误");
      setVerified(false);
    }
  };

  const onSave = async () => {
    if (!verified) {
      setSaveStatus("error");
      setSaveMessage("请先点「测试推送」验证渠道配对成功");
      return;
    }
    setSaveStatus("saving");
    setSaveMessage(null);
    try {
      const resp = await fetch("/api/me/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, channelKey, verified: true }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setSaveStatus("error");
        setSaveMessage(data.error || "保存失败");
        return;
      }
      setSaveStatus("success");
      setSaveMessage("已保存");
      setTimeout(() => router.push("/me"), 800);
    } catch (err) {
      setSaveStatus("error");
      setSaveMessage(err instanceof Error ? err.message : "网络错误");
    }
  };

  return (
    <div>
      {isFirstTime && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <strong>首次设置</strong>:请填写您的通知渠道,系统会在 Giffgaff 保号日前
          170-180 天自动推送提醒给您。
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h2 className="text-lg font-semibold mb-4">通知渠道</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">推送渠道</label>
            <div className="grid grid-cols-2 gap-2">
              <ChannelOption
                selected={channel === "serverchan"}
                onChange={() => {
                  setChannel("serverchan");
                  setVerified(false);
                  setTestStatus("idle");
                  setTestMessage(null);
                }}
                title="Sever酱"
                desc="微信公众号"
              />
              <ChannelOption
                selected={channel === "bark"}
                onChange={() => {
                  setChannel("bark");
                  setVerified(false);
                  setTestStatus("idle");
                  setTestMessage(null);
                }}
                title="Bark"
                desc="iOS / Android App"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              还没注册?
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
                setVerified(false);
                if (testStatus !== "idle") {
                  setTestStatus("idle");
                  setTestMessage(null);
                }
              }}
              placeholder={channel === "serverchan" ? "SCT2xxxxxxxx" : "https://api.day.app/xxx"}
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition font-mono text-sm"
            />

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onTest}
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
              {verified && testStatus !== "success" && (
                <span className="text-xs text-emerald-700">✓ 渠道已验证</span>
              )}
            </div>
          </div>
        </div>

        {saveMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              saveStatus === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}
          >
            {saveMessage}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={onSave}
            disabled={saveStatus === "saving"}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveStatus === "saving" ? "保存中..." : "保存"}
          </button>
          <Link
            href="/me"
            className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
          >
            取消
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChannelOption({
  selected,
  onChange,
  title,
  desc,
}: {
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

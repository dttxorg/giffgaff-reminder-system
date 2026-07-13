"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { todayLocalISODate } from "@/lib/date";
import { PasswordInput } from "@/app/_components/password-input";
import { LoadingButton } from "@/app/_components/loading-button";

type Channel = "serverchan" | "bark" | "pushplus" | "telegram";
type TestStatus = "idle" | "sending" | "success" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

interface MeSettingsClientProps {
  initialChannel: Channel;
  initialChannelKey: string;
  isFirstTime: boolean;
  activatedAt: string;
}

export function MeSettingsClient({
  initialChannel,
  initialChannelKey,
  isFirstTime,
  activatedAt: initialActivatedAt,
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

  // S10: 测试推送反馈持久化
  // 用 localStorage 存最近一次"渠道 + key 组合"的测试结果,刷新页面后还在。
  // 这样用户测完不用立刻保存,刷新几次都能继续看到 ✓ 已验证。
  //
  // 注意:
  // - 用 channel + key 的 sha1 hash 作为后缀,不同 key 的反馈不串
  // - server-side render 时 localStorage 不存在,需要 typeof window 守卫
  // - 切渠道时,旧 key 的反馈虽然还在 storage,但下次访问不会再读,无影响
  /* eslint-disable react-hooks/set-state-in-effect --
     合法 use case:从 localStorage 同步 hydration data 到 React state,
     不能用 useSyncExternalStore 因为 storage 不是"外部 store"是 localStorage。
     只在挂载时跑一次,deps [] 是对的。*/
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hash = quickHash(channelKey);
      const raw = window.localStorage.getItem(`gg-test-${channel}-${hash}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        verified: boolean;
        status: TestStatus;
        message: string | null;
      };
      if (parsed.verified) setVerified(true);
      if (parsed.status && parsed.status !== "idle") {
        setTestStatus(parsed.status);
        setTestMessage(parsed.message);
      }
    } catch {
      // localStorage 被禁 / 损坏,静默忽略
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存测试结果到 localStorage(verified / status / message 任一变化)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hash = quickHash(channelKey);
      const key = `gg-test-${channel}-${hash}`;
      window.localStorage.setItem(
        key,
        JSON.stringify({
          verified,
          status: testStatus,
          message: testMessage,
        })
      );
    } catch {
      // ignore quota / privacy mode
    }
  }, [verified, testStatus, testMessage, channel, channelKey]);

  // hash=#sim-info 时自动展开危险区 details(从 /me '修改' 链接跳转过来)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#sim-info") return;
    const el = document.getElementById("sim-info");
    if (el && el.tagName === "DETAILS") {
      (el as HTMLDetailsElement).open = true;
    }
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
      setTestMessage(
        `已发送,请检查您的 ${
          channel === "serverchan"
            ? "Sever酱 微信"
            : channel === "bark"
            ? "Bark App"
            : channel === "pushplus"
            ? "pushplus 微信公众号"
            : "Telegram"
        }`
      );
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

  // 快捷键 Cmd/Ctrl+S → 触发保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, channel, channelKey, saveStatus]);

  return (
    <div>
      {isFirstTime && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <strong>首次设置</strong>:请填写您的通知渠道,系统会在 Giffgaff 保号日前
          170-180 天自动推送提醒给您。
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h2 className="text-lg font-semibold mb-4">通知渠道</h2>

        {/* S3: 切换渠道时,提示用户需要重新测试推送(否则保存按钮的状态会让人困惑)。
            仅当 channel ≠ 初始 且 未验证 时显示,验证后自动隐藏。 */}
        {channel !== initialChannel && !verified && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0 mt-0.5"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <strong>已切换到 {channelLabel(channel)}</strong>。请在下方填入新渠道的
              key,然后点&ldquo;测试推送&rdquo;验证新渠道收到消息。
              <span className="text-amber-700">未验证的渠道保存后不会真正发推送。</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">推送渠道</label>

            {/* pushplus 警告放到 grid 上方,避免挤占 grid 槽位。
                这样 grid 永远是干净的 2x2,即使未来再加 channel 也不会乱。 */}
            {channel === "pushplus" && (
              <div className="mb-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  新用户不建议
                </div>
                <div>
                  pushplus 现在要求<strong>实名认证</strong>才能发消息,且<strong>实名认证平台要收费</strong>(由 pushplus 收取,跟本系统无关)。
                  新用户建议先选 <strong>Sever酱</strong>(免费,扫码关注公众号即可)
                  或 <strong>Telegram Bot</strong>(免费,需要能访问 Telegram)。
                </div>
              </div>
            )}

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
                desc="iOS App"
              />
              <ChannelOption
                selected={channel === "pushplus"}
                onChange={() => {
                  setChannel("pushplus");
                  setVerified(false);
                  setTestStatus("idle");
                  setTestMessage(null);
                }}
                title="pushplus"
                desc="微信公众号"
              />
              <ChannelOption
                selected={channel === "telegram"}
                onChange={() => {
                  setChannel("telegram");
                  setVerified(false);
                  setTestStatus("idle");
                  setTestMessage(null);
                }}
                title="Telegram"
                desc="机器人推送"
              />
            </div>
            <Link
              href={
                channel === "serverchan"
                  ? "/help/serverchan"
                  : channel === "bark"
                  ? "/help/bark"
                  : channel === "pushplus"
                  ? "/help/pushplus"
                  : "/help/telegram"
              }
              target="_blank"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 hover:shadow transition-all"
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>
                {channel === "serverchan"
                  ? "Sever酱"
                  : channel === "bark"
                  ? "Bark"
                  : channel === "pushplus"
                  ? "pushplus"
                  : "Telegram"}
                 开通教程
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              {channel === "serverchan"
                ? "SendKey"
                : channel === "bark"
                ? "Bark URL"
                : channel === "pushplus"
                ? "pushplus Token"
                : "Bot Token | Chat ID"}
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
              placeholder={
                channel === "serverchan"
                  ? "SCT2xxxxxxxx"
                  : channel === "bark"
                  ? "https://api.day.app/xxx"
                  : channel === "pushplus"
                  ? "abcdef123456...(登录 pushplus 后查看)"
                  : "123456:ABC-DEF...|123456789"
              }
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition font-mono text-sm"
            />

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {cooldown > 0 ? (
                <CooldownRing seconds={cooldown} total={30} />
              ) : (
                <LoadingButton
                  type="button"
                  onClick={onTest}
                  loading={testStatus === "sending"}
                  loadingLabel="发送中"
                  label="测试推送"
                  tone="primary"
                  className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 !bg-white !text-slate-700 hover:!bg-slate-50"
                />
              )}
              {testStatus === "success" && testMessage && (
                <span className="text-xs text-emerald-700 flex items-center gap-1">
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{testMessage}</span>
                </span>
              )}
              {testStatus === "error" && testMessage && (
                <span className="text-xs text-rose-700 flex items-center gap-1">
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>{testMessage}</span>
                </span>
              )}
              {verified && testStatus !== "success" && (
                <span className="text-xs text-emerald-700 flex items-center gap-1">
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  渠道已验证
                </span>
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <LoadingButton
            onClick={onSave}
            loading={saveStatus === "saving"}
            loadingLabel="保存中"
            label="保存"
            tone="primary"
            className="px-5 py-2.5 text-sm"
          />
          {!verified && !saveMessage && (
            <span className="text-xs text-amber-700">
              <span className="inline-flex items-center gap-1">
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                提示: 点击保存前请先在上方点&ldquo;测试推送&rdquo;验证渠道
              </span>
            </span>
          )}
          <Link
            href="/me"
            className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
          >
            取消
          </Link>
        </div>
      </div>

      <PasswordSection />

      {/* 危险操作区:默认收起,避免误改激活日期(会重置保号提醒 schedule) */}
      <details
        id="sim-info"
        className="mt-6 group rounded-xl border border-rose-200 bg-rose-50/30 overflow-hidden scroll-mt-20"
      >
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between hover:bg-rose-50/60 transition-colors">
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-medium">
              <svg
                width={10}
                height={10}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              危险
            </span>
            <span className="text-sm font-medium text-slate-900">高级 · 修改 SIM 卡激活日期</span>
          </span>
          <span aria-hidden="true" className="text-slate-400 group-open:rotate-180 transition-transform">
            ▾
          </span>
        </summary>
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-600 mb-3">
            会重新计算保号提醒节奏。如果之前填错了兑换时的激活日期,在这里修正。
            <strong className="text-rose-700">操作不可撤销</strong>,改完即生效。
          </p>
          <ActivatedAtSection initialActivatedAt={initialActivatedAt} />
        </div>
      </details>
    </div>
  );
}

function ActivatedAtSection({
  initialActivatedAt,
}: {
  initialActivatedAt: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialActivatedAt);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // Esc 关闭激活日期确认弹窗
  useEffect(() => {
    if (!confirmOpen || saving) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirmOpen, saving]);

  // 本地时区今天的 yyyy-MM-dd（详见 lib/date.ts）
  const today = todayLocalISODate();

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today;
  const changed = value !== initialActivatedAt;
  const canSubmit = valid && changed && !saving;

  // 算新激活日期 + 170 天的提醒开始日,给用户直观影响提示
  const reminderStartDate = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return "";
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    d.setUTCDate(d.getUTCDate() + 170);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${dd}`;
  })();

  const onSubmit = async () => {
    if (!canSubmit) return;
    // 打开自定义确认 Modal(替代原生 confirm())
    setConfirmOpen(true);
  };

  const confirmAndSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setMessage(null);
    try {
      const resp = await fetch("/api/me/sim", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activatedAt: value }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setMessage({ kind: "error", text: data.error || "保存失败" });
        return;
      }
      setMessage({ kind: "success", text: "已更新" });
      setEditing(false);
      // 刷新服务端组件，让 /me 上的数据同步
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "网络错误" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="sim-info" className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <h2 className="text-lg font-semibold mb-1">SIM 卡激活日期</h2>
      <p className="text-xs text-slate-500 mb-4">
        兑换时填错了激活日期？在这里可以自行更正（不晚于今天）。
      </p>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">当前激活日期</div>
          <div className="text-base font-medium">{initialActivatedAt}</div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setValue(initialActivatedAt);
              setMessage(null);
            }}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            修改
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">新的激活日期</label>
            <input
              type="date"
              value={value}
              max={today}
              onChange={(e) => {
                setValue(e.target.value);
                if (message) setMessage(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              最早不限，最晚 {today}
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.kind === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border border-rose-200 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-2">
            <LoadingButton
              type="button"
              onClick={onSubmit}
              loading={saving}
              loadingLabel="保存中"
              label="保存"
              tone="primary"
              disabled={!canSubmit}
              className="px-5 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(initialActivatedAt);
                setMessage(null);
              }}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 自定义确认 Modal:替代原生 confirm() 以获得一致样式 + 可关闭遮罩 + 详情展示 */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => !saving && setConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-activated-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-activated-title" className="text-lg font-semibold mb-2">
              确认修改激活日期
            </h2>
            <div className="text-sm text-slate-700 space-y-2">
              <p>
                把激活日期从{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded">{initialActivatedAt}</code>{" "}
                改为{" "}
                <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{value}</code>。
              </p>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  影响
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>会重新计算「已激活天数」</li>
                  <li>如果之后没有保号记录,系统将从 {value} 重新计时 170 天</li>
                  <li>预计下次提醒开始日：<strong>{reminderStartDate || "—"}</strong></li>
                </ul>
              </div>
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm disabled:opacity-50"
              >
                取消
              </button>
              <LoadingButton
                type="button"
                onClick={confirmAndSave}
                loading={saving}
                loadingLabel="保存中"
                label="确认修改"
                tone="danger"
                className="px-4 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordSection() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const newPwValid = newPassword.length >= 8;
  const match = newPassword === newPasswordConfirm;
  const canSubmit =
    oldPassword.length > 0 && newPwValid && match && status !== "saving";

  const onSubmit = async () => {
    if (!canSubmit) return;
    setStatus("saving");
    setMessage(null);
    try {
      const resp = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setStatus("error");
        setMessage(data.error || "修改失败");
        return;
      }
      setStatus("success");
      setMessage("密码已更新");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "网络错误");
    }
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <h2 className="text-lg font-semibold mb-1">修改登录密码</h2>
      <p className="text-xs text-slate-500 mb-4">
        建议把管理员给的初始密码改为您自己熟悉的密码
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">当前密码</label>
          <PasswordInput
            value={oldPassword}
            onChange={setOldPassword}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">新密码</label>
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="至少 8 位"
            autoComplete="new-password"
            minLength={8}
            invalid={!!(newPassword && newPassword.length < 8)}
          />
          {newPassword && newPassword.length < 8 && (
            <p className="text-xs text-rose-600 mt-1.5">
              密码至少 8 位（当前 {newPassword.length} 位）
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            再次输入新密码
          </label>
          <PasswordInput
            value={newPasswordConfirm}
            onChange={setNewPasswordConfirm}
            autoComplete="new-password"
            minLength={8}
            invalid={!!(newPasswordConfirm && !match)}
          />
          {newPasswordConfirm && !match && (
            <p className="text-xs text-rose-600 mt-1">两次密码不一致</p>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            status === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <LoadingButton
          onClick={onSubmit}
          loading={status === "saving"}
          loadingLabel="保存中"
          label="更新密码"
          tone="primary"
          disabled={!canSubmit}
          className="px-5 py-2.5 text-sm !bg-slate-900 hover:!bg-slate-800 disabled:!bg-slate-300"
        />
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

/**
 * 短哈希,用于 localStorage key 区分不同 channelKey。
 * 不需要密码学强度,只需避免不同 key 撞 storage 键。
 *
 * 注意:仅用于本地 key 命名,不用于安全场景。
 */
function quickHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  // 转为无符号 32-bit,再 base36 缩短
  return (h >>> 0).toString(36);
}

/**
 * 冷却倒计时圆环(S4 修复)
 * - 圆环从 100% 走到 0%,配合数字显示秒数
 * - 用 stroke-dashoffset 动画,无 JS 定时
 */
function CooldownRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.max(0, Math.min(1, seconds / total));
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-500"
      aria-live="polite"
      role="status"
    >
      <svg
        width={28}
        height={28}
        viewBox="0 0 28 28"
        aria-hidden="true"
        className="shrink-0 -rotate-90"
      >
        {/* 背景环 */}
        <circle
          cx="14"
          cy="14"
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="opacity-20"
        />
        {/* 进度环 */}
        <circle
          cx="14"
          cy="14"
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-indigo-500 transition-all duration-1000 ease-linear"
        />
      </svg>
      <span>
        请稍候 <strong className="text-slate-700">{seconds}s</strong> 后重试
      </span>
    </span>
  );
}

/** 把 channel id 转成中文展示名(用于 S3 banner) */
function channelLabel(channel: Channel): string {
  switch (channel) {
    case "serverchan":
      return "Sever酱";
    case "bark":
      return "Bark";
    case "pushplus":
      return "pushplus";
    case "telegram":
      return "Telegram";
  }
}

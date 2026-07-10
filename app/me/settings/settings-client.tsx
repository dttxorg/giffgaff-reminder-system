"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { todayLocalISODate } from "@/lib/date";

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

            {/* pushplus 警告放到 grid 上方,避免挤占 grid 槽位。
                这样 grid 永远是干净的 2x2,即使未来再加 channel 也不会乱。 */}
            {channel === "pushplus" && (
              <div className="mb-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                <div className="font-semibold mb-1">⚠️ 新用户不建议</div>
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
              <span aria-hidden="true">📖</span>
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onSave}
            disabled={saveStatus === "saving"}
            // 这里不直接禁用 — 让用户点了能看到错误,而不是无声禁用
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveStatus === "saving" ? "保存中..." : "保存"}
          </button>
          {!verified && !saveMessage && (
            <span className="text-xs text-amber-700">
              ⚠ 提示: 点击保存前请先在上方点&ldquo;测试推送&rdquo;验证渠道
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
      <details className="mt-6 group rounded-2xl border border-rose-200 bg-rose-50/30 overflow-hidden">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between hover:bg-rose-50/60 transition-colors">
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-medium">
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
    <div id="sim-info" className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
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
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
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
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
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
                <div className="font-semibold mb-1">⚠️ 影响</div>
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
              <button
                type="button"
                onClick={confirmAndSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "确认修改"}
              </button>
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
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <h2 className="text-lg font-semibold mb-1">修改登录密码</h2>
      <p className="text-xs text-slate-500 mb-4">
        建议把管理员给的初始密码改为您自己熟悉的密码
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">当前密码</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">新密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="至少 8 位"
            autoComplete="new-password"
            minLength={8}
            className={`w-full px-3.5 py-2.5 rounded-lg border outline-none ${
              newPassword && newPassword.length < 8
                ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            }`}
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
          <input
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={`w-full px-3.5 py-2.5 rounded-lg border outline-none ${
              newPasswordConfirm && !match
                ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            }`}
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
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === "saving" ? "保存中..." : "更新密码"}
        </button>
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

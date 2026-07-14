"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizePhone } from "@/lib/phone";
import { todayLocalISODate } from "@/lib/date";
import { formatCardCodeInput } from "@/lib/card-key";
import {
  passwordStrength,
  STRENGTH_LABEL,
  STRENGTH_COLOR,
} from "@/lib/password-strength";
import { PasswordInput } from "@/app/_components/password-input";
import { Spinner } from "@/app/_components/skip-to-content";

type Phase =
  | { kind: "input" }
  | { kind: "previewing"; code: string }
  | { kind: "form"; code: string; notes: string | null }
  | { kind: "redeeming" }
  | { kind: "error"; message: string };

interface RedeemClientProps {
  initialCode: string;
  isLoggedIn: boolean;
  currentUsername?: string;
  /** 账号下已有 sim 数(给用户提示"再添加 1 张"等) */
  existingSimCount?: number;
}

export function RedeemClient({
  initialCode,
  isLoggedIn,
  currentUsername,
  existingSimCount = 0,
}: RedeemClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(
    initialCode.trim() ? { kind: "previewing", code: initialCode.trim() } : { kind: "input" }
  );
  const [codeInput, setCodeInput] = useState(initialCode);

  useEffect(() => {
    if (phase.kind === "previewing") {
      void doPreview(phase.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doPreview(code: string) {
    try {
      const resp = await fetch(
        `/api/redeem/preview?code=${encodeURIComponent(code)}`
      );
      const data = await resp.json();
      if (!data.ok) {
        setPhase({ kind: "error", message: data.error || "卡密无效" });
        return;
      }
      setPhase({ kind: "form", code, notes: data.notes });
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "网络错误",
      });
    }
  }

  /**
   * 兑换提交。
   * 已登录:只需 card+phone+date,挂到当前 user
   * 未登录:加 username+password,创建新 user
   */
  async function doRedeem(args: {
    code: string;
    phone: string;
    date: string;
    username?: string;
    password?: string;
  }) {
    setPhase({ kind: "redeeming" });
    try {
      const body: Record<string, string> = {
        code: args.code,
        phoneNumber: normalizePhone(args.phone),
        activatedAt: args.date,
      };
      if (!isLoggedIn) {
        if (!args.username || !args.password) return;
        body.username = args.username.trim().toLowerCase();
        body.password = args.password;
      }
      const resp = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!data.ok) {
        setPhase({ kind: "error", message: data.error || "兑换失败" });
        return;
      }
      router.push(data.redirect || "/me");
      router.refresh();
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "网络错误",
      });
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
      {phase.kind === "input" && (
        <InputPhase
          value={codeInput}
          onChange={setCodeInput}
          onSubmit={() => {
            const c = codeInput.trim();
            if (!c) return;
            setPhase({ kind: "previewing", code: c });
            void doPreview(c);
          }}
        />
      )}

      {phase.kind === "previewing" && (
        <div className="text-center py-8 text-slate-500 text-sm">
          正在校验卡密…
        </div>
      )}

      {phase.kind === "form" && (
        <FormPhase
          notes={phase.notes}
          isLoggedIn={isLoggedIn}
          currentUsername={currentUsername}
          existingSimCount={existingSimCount}
          onSubmit={(username, password, phone, date) =>
            doRedeem({ code: phase.code, username, password, phone, date })
          }
          onBack={() => setPhase({ kind: "input" })}
        />
      )}

      {phase.kind === "redeeming" && (
        <div className="text-center py-10">
          <Spinner size={20} label="兑换中" />
          <p className="text-sm text-slate-600 mt-3">
            {isLoggedIn ? "正在绑定新的 SIM 卡..." : "正在创建您的账户..."}
          </p>
        </div>
      )}

      {phase.kind === "error" && (
        <ErrorView
          message={phase.message}
          onRetry={() => {
            setPhase({ kind: "input" });
            setCodeInput("");
          }}
        />
      )}
    </div>
  );
}

function InputPhase({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="block text-sm font-medium mb-1.5">卡密</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(formatCardCodeInput(e.target.value))}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        autoFocus
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-base tracking-wider focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
      />
      <p className="text-xs text-slate-500 mt-2">
        卡密 16 位字母数字,可在 SIM 卡包装或销售方提供处找到
      </p>
      <button
        type="submit"
        disabled={!value.trim()}
        className="mt-5 w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:text-slate-300 transition-colors"
      >
        下一步
      </button>
    </form>
  );
}

function FormPhase({
  notes,
  isLoggedIn,
  currentUsername,
  existingSimCount,
  onSubmit,
  onBack,
}: {
  notes: string | null;
  isLoggedIn: boolean;
  currentUsername?: string;
  existingSimCount: number;
  onSubmit: (username: string, password: string, phone: string, date: string) => void;
  onBack: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(() => todayLocalISODate());
  // 新用户场景需要 username + password
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const validPhone = normalizePhone(phone).length >= 6;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

  // username 校验(归一化后)
  const usernameNorm = username.replace(/[\s-]/g, "").trim().toLowerCase();
  const isPhoneLike = /^\d{6,15}$/.test(usernameNorm);
  const isTextUsername = /^[a-z][a-z0-9_]{2,19}$/.test(usernameNorm);
  const validUsername = isPhoneLike || isTextUsername;

  const validPassword = password.length >= 8;
  const passwordsMatch = password === passwordConfirm;

  const canSubmit = isLoggedIn
    ? validPhone && validDate
    : validPhone && validDate && validUsername && validPassword && passwordsMatch;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        if (isLoggedIn) {
          onSubmit("", "", phone, date); // username/password 不用,但 onSubmit 签名统一
        } else {
          onSubmit(usernameNorm, password, phone, date);
        }
      }}
      className="space-y-4"
    >
      <div
        className={`p-4 rounded-lg border ${
          isLoggedIn
            ? "bg-indigo-50 border-indigo-200"
            : "bg-emerald-50 border-emerald-200"
        }`}
      >
        <div
          className={`text-sm font-medium mb-1 inline-flex items-center gap-1.5 ${
            isLoggedIn ? "text-indigo-900" : "text-emerald-900"
          }`}
        >
          <svg
            width={16}
            height={16}
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
          {isLoggedIn ? "卡密有效,绑定到当前账号" : "卡密有效"}
        </div>
        <div
          className={`text-xs ${
            isLoggedIn ? "text-indigo-800" : "text-emerald-700"
          }`}
        >
          {isLoggedIn ? (
            <>
              绑定到账号 <strong className="font-mono">{currentUsername}</strong> 下,
              这是第 <strong>{existingSimCount + 1}</strong> 张 SIM 卡。
              {existingSimCount > 0 && " 渠道默认沿用首张卡的设置,可在「设置」里单独调整。"}
            </>
          ) : (
            <>
              请填写您的 SIM 卡信息、设置账号和登录密码完成绑定。
              兑换成功后将自动登录,系统会引导您到设置页绑定推送渠道（Sever酱 / Bark 等）,
              <strong>绑定后才会真正开始接收保号提醒</strong>。
            </>
          )}
        </div>
      </div>

      {notes && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
          <div className="flex items-center gap-1.5 text-amber-900 font-medium mb-0.5">
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
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>卡密备注</span>
          </div>
          <div className="text-amber-800">{notes}</div>
          <p className="text-xs text-amber-700 mt-1">
            这条备注仅作识别,不会出现在您的账户信息里
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Giffgaff SIM 卡号
        </label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07724215611"
          autoComplete="off"
          inputMode="tel"
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">激活日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        {date === todayLocalISODate() ? (
          <p className="text-xs text-amber-700 mt-1.5">
            <strong>当前默认是今天</strong>(如果您是老用户补录历史保号日期,
            请改成实际保号的那天)
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-1.5">
            从这天起算 170 天开始提醒您保号
          </p>
        )}
      </div>

      {/* 新用户场景:需要 username + password */}
      {!isLoggedIn && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              设置登录账号
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="手机号(如 07724215611)或自定义账号(如 alice_2024)"
              autoComplete="username"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              支持两种格式:6+ 位纯数字(手机号)或 3-20 位小写字母开头(字母/数字/下划线)
              {username && !validUsername && (
                <span className="text-rose-600 ml-1">格式不正确</span>
              )}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-sm font-medium mb-1.5">
              设置登录密码
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="至少 8 位"
              autoComplete="new-password"
              required
              minLength={8}
              invalid={!!(password && password.length < 8)}
            />
            <div className="mt-2">
              <PasswordInput
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                placeholder="再输一遍"
                autoComplete="new-password"
                required
                minLength={8}
                invalid={!!(passwordConfirm && !passwordsMatch)}
              />
            </div>
            {password && password.length < 8 ? (
              <p className="text-xs text-rose-600 mt-1.5">
                密码至少 8 位（当前 {password.length} 位）
              </p>
            ) : (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      role="progressbar"
                      aria-label="密码强度"
                      aria-valuenow={
                        passwordStrength(password) === "weak"
                          ? 33
                          : passwordStrength(password) === "medium"
                            ? 66
                            : 100
                      }
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className={`h-full transition-all ${
                        STRENGTH_COLOR[passwordStrength(password)]
                      }`}
                      style={{
                        width: `${
                          passwordStrength(password) === "weak"
                            ? 33
                            : passwordStrength(password) === "medium"
                              ? 66
                              : 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 w-4">
                    {STRENGTH_LABEL[passwordStrength(password)]}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  请妥善保存,忘记后需联系管理员重置
                </p>
              </div>
            )}
            {passwordConfirm && !passwordsMatch && (
              <p className="text-xs text-rose-600 mt-1">两次密码不一致</p>
            )}
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isLoggedIn ? "绑定到我的账号" : "兑换并登录"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
        >
          返回
        </button>
      </div>
    </form>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
        <div className="text-sm font-medium text-rose-900 mb-1">兑换失败</div>
        <div className="text-sm text-rose-700">{message}</div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
      >
        重新输入
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizePhone } from "@/lib/phone";

type Phase =
  | { kind: "input" }
  | { kind: "previewing"; code: string }
  | { kind: "form"; code: string; notes: string | null }
  | { kind: "redeeming" }
  | { kind: "error"; message: string };

interface RedeemClientProps {
  initialCode: string;
}

export function RedeemClient({ initialCode }: RedeemClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(
    initialCode.trim() ? { kind: "previewing", code: initialCode.trim() } : { kind: "input" }
  );
  const [codeInput, setCodeInput] = useState(initialCode);

  // 自动预览: 如果初始就带 code
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

  async function doRedeem(
    code: string,
    phone: string,
    date: string
  ) {
    setPhase({ kind: "redeeming" });
    try {
      const resp = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          phoneNumber: normalizePhone(phone),
          activatedAt: date,
        }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setPhase({ kind: "error", message: data.error || "兑换失败" });
        return;
      }
      router.push(data.redirect || "/me");
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "网络错误",
      });
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
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
          onSubmit={(phone, date) => doRedeem(phase.code, phone, date)}
          onBack={() => setPhase({ kind: "input" })}
        />
      )}

      {phase.kind === "redeeming" && (
        <div className="text-center py-8 text-slate-500 text-sm">
          兑换中…
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
        onChange={(e) => onChange(e.target.value)}
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
        className="mt-5 w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        下一步
      </button>
    </form>
  );
}

function FormPhase({
  notes,
  onSubmit,
  onBack,
}: {
  notes: string | null;
  onSubmit: (phone: string, date: string) => void;
  onBack: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(() => todayLocalISODate());

  const validPhone = normalizePhone(phone).length >= 6;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!validPhone || !validDate) return;
        onSubmit(phone, date);
      }}
      className="space-y-4"
    >
      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
        <div className="text-sm font-medium text-emerald-900 mb-1">
          ✓ 卡密有效
        </div>
        <div className="text-xs text-emerald-700">
          请填写您的 SIM 卡信息和激活日期完成绑定
        </div>
      </div>

      {notes && (
        <div className="text-sm text-slate-600 bg-slate-50 rounded p-3 border border-slate-200">
          {notes}
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
        <p className="text-xs text-slate-500 mt-1.5">
          从这天起算 170 天开始提醒您保号
        </p>
      </div>

      <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 border border-slate-200">
        兑换后将自动登录,绑定推送渠道后即可接收保号提醒
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!validPhone || !validDate}
          className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          兑换并登录
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

/** 本地时区今天的 yyyy-MM-dd */
function todayLocalISODate(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
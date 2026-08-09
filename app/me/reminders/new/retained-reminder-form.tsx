"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { todayLocalISODate } from "@/lib/date";
import { normalizePhone } from "@/lib/phone";

type Carrier = "giffgaff" | "ctexcel";

const PRESETS = {
  giffgaff: { label: "Giffgaff", start: 170, cycle: 180 },
  ctexcel: { label: "CTExcel", start: 85, cycle: 90 },
} as const;

export function RetainedReminderForm() {
  const router = useRouter();
  const [carrier, setCarrier] = useState<Carrier>("giffgaff");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activatedAt, setActivatedAt] = useState(todayLocalISODate());
  const [reminderStartDay, setReminderStartDay] = useState(170);
  const [cycleDays, setCycleDays] = useState(180);
  const [advanced, setAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseCarrier(next: Carrier) {
    const preset = PRESETS[next];
    setCarrier(next);
    setReminderStartDay(preset.start);
    setCycleDays(preset.cycle);
  }

  const valid =
    normalizePhone(phoneNumber).length >= 6 &&
    /^\d{4}-\d{2}-\d{2}$/.test(activatedAt) &&
    reminderStartDay >= 0 &&
    cycleDays > reminderStartDay;

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/me/sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: normalizePhone(phoneNumber),
          activatedAt,
          carrier,
          reminderStartDay,
          cycleDays,
        }),
      });
      const data = await response.json();
      if (!data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      router.push(`/me?simId=${data.simId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-5 p-5 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">运营商预设</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(Object.keys(PRESETS) as Carrier[]).map((value) => {
            const preset = PRESETS[value];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={carrier === value}
                onClick={() => chooseCarrier(value)}
                className={`min-h-20 rounded-2xl border p-3 text-left transition ${
                  carrier === value
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block font-semibold text-slate-950">{preset.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  第 {preset.start} 天提醒 · 第 {preset.cycle} 天截止
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">SIM 号码</span>
        <input
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="请输入完整号码"
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-900">本轮起算日期</span>
        <input
          type="date"
          value={activatedAt}
          max={todayLocalISODate()}
          onChange={(event) => setActivatedAt(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50">
        <button
          type="button"
          aria-expanded={advanced}
          onClick={() => setAdvanced((value) => !value)}
          className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold text-slate-800"
        >
          自定义提醒日期
          <span className="text-xs font-normal text-slate-500">
            {reminderStartDay} / {cycleDays} 天 {advanced ? "收起" : "调整"}
          </span>
        </button>
        {advanced && (
          <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              第几天开始提醒
              <input
                type="number"
                min={0}
                max={3649}
                value={reminderStartDay}
                onChange={(event) => setReminderStartDay(Number(event.target.value))}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
            </label>
            <label className="text-sm text-slate-700">
              第几天截止
              <input
                type="number"
                min={1}
                max={3650}
                value={cycleDays}
                onChange={(event) => setCycleDays(Number(event.target.value))}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
            </label>
            {cycleDays <= reminderStartDay && (
              <p className="text-xs text-rose-700 sm:col-span-2">
                截止日必须晚于提醒开始日。
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
        原通知渠道将自动沿用。保存后，该名额会重新开始监控这个号码。
      </div>

      <button
        type="submit"
        disabled={!valid || submitting}
        className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        {submitting ? "正在保存…" : "启用这个号码的提醒"}
      </button>
    </form>
  );
}

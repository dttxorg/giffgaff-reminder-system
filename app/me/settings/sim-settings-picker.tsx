"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPhoneForDisplay } from "@/lib/phone";

interface SettingsSimOption {
  id: number;
  phoneNumber: string;
  isPrimary: boolean;
}

export function SimSettingsPicker({
  sims,
  activeSimId,
}: {
  sims: SettingsSimOption[];
  activeSimId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeIndex = Math.max(
    0,
    sims.findIndex((sim) => sim.id === activeSimId)
  );

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="settings-sim-picker" className="text-sm font-medium text-slate-800">
          选择要设置的号码
        </label>
        <span className="text-xs text-slate-500">
          {activeIndex + 1} / {sims.length}
        </span>
      </div>
      <select
        id="settings-sim-picker"
        value={activeSimId}
        disabled={isPending}
        aria-busy={isPending}
        onChange={(event) => {
          const nextId = Number(event.target.value);
          if (!Number.isInteger(nextId) || nextId === activeSimId) return;
          startTransition(() => {
            router.push(`/me/settings?simId=${nextId}`);
          });
        }}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-mono text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-wait disabled:bg-slate-50 sm:text-sm"
      >
        {sims.map((sim) => (
          <option key={sim.id} value={sim.id}>
            {sim.isPrimary ? "主卡 · " : ""}
            {formatPhoneForDisplay(sim.phoneNumber)}
          </option>
        ))}
      </select>
      {isPending && (
        <p className="mt-2 text-xs text-indigo-700" role="status" aria-live="polite">
          正在切换号码设置…
        </p>
      )}
    </div>
  );
}

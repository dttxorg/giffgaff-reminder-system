"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmModal } from "@/app/_components/confirm-modal";
import { LoadingButton } from "@/app/_components/loading-button";
import { TestPushButton } from "../_components/test-push-button";
import { formatRelativeTime } from "@/lib/date";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import type { AdminSimDetail } from "@/lib/admin-sim-detail";

export function EditSimClient({ initialSim }: { initialSim: AdminSimDetail }) {
  const sim = initialSim;
  const id = String(sim.id);
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState(sim.phoneNumber);
  const [activatedAt, setActivatedAt] = useState(sim.activatedAt);
  const [lastPortedAt, setLastPortedAt] = useState<string>(
    sim.lastPortedAt ?? ""
  );
  const [status, setStatus] = useState<"active" | "paused">(sim.status);
  const [carrier, setCarrier] = useState<"giffgaff" | "ctexcel">(
    sim.carrier ?? "giffgaff"
  );
  const [reminderStartDay, setReminderStartDay] = useState(
    sim.reminderStartDay ?? 170
  );
  const [cycleDays, setCycleDays] = useState(sim.cycleDays ?? 180);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/sims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          activatedAt,
          lastPortedAt: lastPortedAt || null,
          status,
          carrier,
          reminderStartDay,
          cycleDays,
        }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      router.push("/admin/sims");
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/sims/${id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "删除失败");
        setLoading(false);
        return;
      }
      router.push("/admin/sims");
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">编辑号码 #{id}</h1>
        <Link href="/admin/sims" className="text-sm text-slate-500 hover:text-slate-900">
          ← 返回列表
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">运营商预设</label>
          <select
            value={carrier}
            onChange={(event) => {
              const next = event.target.value as "giffgaff" | "ctexcel";
              setCarrier(next);
              setReminderStartDay(next === "ctexcel" ? 85 : 170);
              setCycleDays(next === "ctexcel" ? 90 : 180);
            }}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
          >
            <option value="giffgaff">Giffgaff</option>
            <option value="ctexcel">CTExcel</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            提醒开始日
            <input
              type="number"
              min={0}
              max={3649}
              value={reminderStartDay}
              onChange={(event) => setReminderStartDay(Number(event.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
            />
          </label>
          <label className="text-sm font-medium">
            截止日
            <input
              type="number"
              min={1}
              max={3650}
              value={cycleDays}
              onChange={(event) => setCycleDays(Number(event.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">手机号</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">激活日期</label>
          <input
            type="date"
            value={activatedAt}
            onChange={(e) => setActivatedAt(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">上次保号日期 (留空表示未保过)</label>
          <input
            type="date"
            value={lastPortedAt}
            onChange={(e) => setLastPortedAt(e.target.value)}
            min={activatedAt || undefined}
            disabled={!activatedAt}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-1">
            不能早于激活日期
          </p>
        </div>
        {/* 已激活 X 天指示:复用 lib/bucket 的 dayOffsetFromBaseline 计算 */}
        {(() => {
          const baseline = sim.lastPortedAt ?? sim.activatedAt;
          const days = dayOffsetFromBaseline(new Date(baseline));
          const inWindow = isInReminderWindow(days, {
            carrier,
            reminderStartDay,
            cycleDays,
          });
          return (
            <div className="text-xs text-slate-500 px-1 flex items-center gap-3 flex-wrap">
              <span>
                <span className="text-slate-700 font-medium">{days}</span> 天
                {sim.lastPortedAt ? " 自上次保号" : " 自激活"}
              </span>
              {inWindow && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  提醒窗口内({reminderStartDay}-{cycleDays})
                </span>
              )}
              {days > cycleDays && (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                  已超 {cycleDays} 天
                </span>
              )}
              {sim.lastPortedAt && (
                <Link
                  href={`/admin/reminders?simId=${sim.id}`}
                  className="text-indigo-600 hover:underline ml-auto"
                >
                  查看该 sim 推送日志 →
                </Link>
              )}
            </div>
          );
        })()}

        <div>
          <label className="block text-sm font-medium mb-1.5">状态</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "paused")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 outline-none"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
          </select>
        </div>

        {sim.user && (
          <Link
            href="/admin/users"
            className="block text-sm p-3 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-indigo-600 font-medium">已绑定 user</div>
                <div className="text-slate-700 mt-0.5">
                  账号: <span className="font-medium">{sim.user.username}</span> · ID: {sim.user.id}
                </div>
              </div>
              <span className="text-indigo-600 text-xs shrink-0">查看所有用户 →</span>
            </div>
          </Link>
        )}

        <div className="flex gap-2">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="保存中"
            label="保存"
            tone="primary"
            className="px-4 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm font-medium hover:bg-rose-100 disabled:opacity-50"
          >
            删除
          </button>
        </div>
      </form>

      <ConfirmModal
        open={deleteOpen}
        title="确认删除该号码？"
        tone="danger"
        confirmLabel="删除"
        loading={loading}
        onConfirm={onDelete}
        onClose={() => !loading && setDeleteOpen(false)}
        description={
          <>
            <p>这是一个不可逆操作,删除后:</p>
            <ul className="list-disc list-inside text-slate-600">
              <li>该号码及所有相关 user / reminder 会被级联删除</li>
              <li>绑定的用户账号失效,登录会话被清空</li>
              {sim.user && (
                <li>
                  当前绑定 user #{sim.user.id} ({sim.user.username}) 也会被删除
                </li>
              )}
            </ul>
          </>
        }
      />

      {/* 最近推送记录: admin 排错最常用信息(为什么最近没收到/失败了) */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900">最近 5 条推送</h2>
          <div className="flex items-center gap-3">
            <TestPushButton simId={sim.id} isBound={sim.user !== null} />
            <Link
              href={`/admin/reminders?simId=${sim.id}`}
              className="text-xs text-indigo-600 hover:underline"
            >
              查看全部 →
            </Link>
          </div>
        </div>
        {sim.recentReminders.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            暂无推送记录
          </p>
        ) : (
          <ul className="space-y-2">
            {sim.recentReminders.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span
                  className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                    r.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-slate-700">
                      第 {r.dayOffset} 天 · 第 {r.bucket + 1} 桶
                    </span>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${
                        r.status === "success"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {r.status === "success" ? "送达" : "失败"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    {formatRelativeTime(r.sentAt)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {r.sentAt} UTC
                  </div>
                  {r.errorMessage && (
                    <div
                      className="text-xs text-rose-700 mt-1 break-words"
                      title={r.errorMessage}
                    >
                      {r.errorMessage.length > 80
                        ? r.errorMessage.slice(0, 80) + "…"
                        : r.errorMessage}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

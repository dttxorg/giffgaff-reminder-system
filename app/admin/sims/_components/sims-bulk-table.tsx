"use client";

import Link from "next/link";
import { useState } from "react";
import { formatRelativeTime } from "@/lib/date";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/app/_components/confirm-modal";

interface SimRow {
  id: number;
  phoneNumber: string;
  activatedAt: string;
  lastPortedAt: string | null;
  status: "active" | "paused";
  dayOffset: number;
  inWindow: boolean;
  channel: string;
  lastSentAt: string | null;
  lastSentStatus: "success" | "failed" | null;
}

interface SimsBulkTableProps {
  sims: SimRow[];
}

type BulkAction = "delete" | "pause" | "activate" | "test-push";

/**
 * sims 列表 + 多选 + 批量操作
 *
 * 设计选择:
 * - 选择状态只在前端维护(不需要 URL 同步;选择是临时操作意图)
 * - "全选" 当 checkbox checked 时全选所有当前页 sim
 * - 批量操作按钮:激活 / 暂停 / 删除
 * - 删除前用浏览器 confirm 做最后一道防御(不可绕过,虽然已经有选中二次确认)
 */
export function SimsBulkTable({ sims }: SimsBulkTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadingAction, setLoadingAction] = useState<BulkAction | null>(null);
  const loading = loadingAction !== null;
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  // 危险操作前弹 ConfirmModal:delete 用 danger 红色、test-push 用 primary 蓝色
  const [confirm, setConfirm] = useState<
    | {
        action: "delete" | "test-push";
        title: string;
        description: React.ReactNode;
        confirmLabel: string;
        tone: "danger" | "primary";
      }
    | null
  >(null);

  const allOnPage = sims.length > 0 && sims.every((s) => selected.has(s.id));
  const someOnPage = sims.some((s) => selected.has(s.id));
  const totalSelected = selected.size;

  const toggleAll = () => {
    if (allOnPage) {
      const next = new Set(selected);
      sims.forEach((s) => next.delete(s.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      sims.forEach((s) => next.add(s.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const runAction = async (action: BulkAction) => {
    setConfirm(null);
    setLoadingAction(action);
    setMessage(null);
    const url = action === "test-push" ? "/api/admin/sims/test-push" : "/api/admin/sims/batch";
    const body = action === "test-push"
      ? { simIds: Array.from(selected) }
      : { ids: Array.from(selected), action };
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!data.ok) {
        setMessage({ kind: "error", text: data.error || "操作失败" });
        return;
      }
      if (action === "test-push") {
        const total = data.summary?.total ?? 0;
        const ok = data.summary?.success ?? 0;
        const fail = data.summary?.failed ?? 0;
        setMessage({
          kind: "success",
          text: `测试推送 ${total} 个:成功 ${ok},失败 ${fail}`,
        });
      } else {
        setMessage({
          kind: "success",
          text: `已${actionLabel(action)} ${data.affected} 个号码`,
        });
      }
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setMessage({
        kind: "error",
        text: e instanceof Error ? e.message : "网络错误",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const submit = async (action: BulkAction) => {
    if (selected.size === 0) return;
    // 危险/副作用操作弹 ConfirmModal 二次确认(替代原生 confirm())
    if (action === "delete") {
      setConfirm({
        action,
        title: `确认删除 ${selected.size} 个号码?`,
        confirmLabel: `删除 ${selected.size} 个`,
        tone: "danger",
        description: (
          <ul className="list-disc list-inside text-slate-600">
            <li>会级联删除绑定 user 和 reminders_sent</li>
            <li>不可恢复,删除前请确认已通知相关客户</li>
          </ul>
        ),
      });
      return;
    }
    if (action === "test-push") {
      setConfirm({
        action,
        title: `向 ${selected.size} 个用户发送测试推送?`,
        confirmLabel: `发送 ${selected.size} 条`,
        tone: "primary",
        description: (
          <ul className="list-disc list-inside text-slate-600">
            <li>用户的 Sever酱/Bark/Telegram 等渠道都会收到一条消息</li>
            <li>会消耗对应渠道的当日推送配额(对 Sever酱 免费 5 条/天)</li>
            <li>用于排查渠道是否配置正确</li>
          </ul>
        ),
      });
      return;
    }
    // pause/activate 直接执行(无破坏性)
    runAction(action);
  };

  return (
    <>
      {/* 批量操作工具栏 — 仅在有选中时显示 */}
      {totalSelected > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3"
          aria-busy={loading}
        >
          <span className="text-sm text-indigo-900 font-medium">
            已选 <strong>{totalSelected}</strong> 个
          </span>
          <button
            type="button"
            onClick={() => submit("test-push")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-indigo-300 text-indigo-800 bg-white hover:bg-indigo-50 disabled:opacity-50 transition-colors"
          >
            {loadingAction === "test-push" ? "发送中…" : "测试推送"}
          </button>
          <button
            type="button"
            onClick={() => submit("activate")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            {loadingAction === "activate" ? "激活中…" : "激活"}
          </button>
          <button
            type="button"
            onClick={() => submit("pause")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-amber-300 text-amber-800 bg-white hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            {loadingAction === "pause" ? "暂停中…" : "暂停"}
          </button>
          <button
            type="button"
            onClick={() => submit("delete")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-rose-300 text-rose-800 bg-white hover:bg-rose-50 disabled:opacity-50 transition-colors"
          >
            {loadingAction === "delete" ? "删除中…" : "删除"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            清除选择
          </button>
          {loadingAction && (
            <span className="w-full text-xs text-indigo-700 sm:ml-auto sm:w-auto" role="status" aria-live="polite">
              正在{pendingActionLabel(loadingAction)} {totalSelected} 个号码，请稍候
            </span>
          )}
        </div>
      )}
      {message && (
        <div
          className={`mb-3 p-3 rounded-lg text-sm ${
            message.kind === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 w-8">
              <input
                type="checkbox"
                checked={allOnPage}
                ref={(el) => {
                  if (el) el.indeterminate = !allOnPage && someOnPage;
                }}
                onChange={toggleAll}
                aria-label="全选当前页"
                className="w-4 h-4 cursor-pointer accent-indigo-600"
              />
            </th>
            <th className="text-left px-3 py-2 hidden md:table-cell">ID</th>
            <th className="text-left px-3 py-2">手机号</th>
            <th className="text-left px-3 py-2 hidden md:table-cell">激活日期</th>
            <th className="text-left px-3 py-2 hidden md:table-cell">上次保号</th>
            <th className="text-left px-3 py-2 hidden md:table-cell">天数</th>
            <th className="text-left px-3 py-2">状态</th>
            <th className="text-left px-3 py-2 hidden md:table-cell">绑定</th>
            <th className="text-left px-3 py-2 hidden md:table-cell">上次发送</th>
            <th className="text-left px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {sims.map((sim) => {
            const checked = selected.has(sim.id);
            return (
              <tr
                key={sim.id}
                className={`border-t border-slate-100 ${
                  checked ? "bg-indigo-50/40" : ""
                }`}
              >
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(sim.id)}
                    aria-label={`选择 sim ${sim.id}`}
                    className="w-4 h-4 cursor-pointer accent-indigo-600"
                  />
                </td>
                <td className="hidden px-3 py-2 font-mono text-xs text-slate-500 md:table-cell">{sim.id}</td>
                <td className="px-3 py-2 font-mono">{sim.phoneNumber}</td>
                <td className="hidden px-3 py-2 md:table-cell">{sim.activatedAt}</td>
                <td className="hidden px-3 py-2 text-slate-500 md:table-cell">{sim.lastPortedAt || "—"}</td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <span
                    className={
                      sim.inWindow
                        ? "text-amber-700 font-semibold"
                        : "text-slate-700"
                    }
                  >
                    {sim.dayOffset}d
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      sim.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sim.status}
                  </span>
                </td>
                <td className="hidden px-3 py-2 text-xs md:table-cell">
                  <span className="text-slate-700">{sim.channel}</span>
                </td>
                <td className="hidden px-3 py-2 text-xs md:table-cell">
                  {sim.lastSentAt ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                            sim.lastSentStatus === "success"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="text-slate-700 whitespace-nowrap">
                          {formatRelativeTime(sim.lastSentAt)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap mt-0.5 pl-3.5">
                        {sim.lastSentAt.replace("T", " ").slice(0, 16)} UTC
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">未发过</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/sims/${sim.id}`}
                    prefetch={false}
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    编辑
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title ?? ""}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone ?? "primary"}
        loading={loading}
        onConfirm={() => confirm && runAction(confirm.action)}
        onClose={() => !loading && setConfirm(null)}
        description={confirm?.description}
      />
    </>
  );
}

function actionLabel(action: "delete" | "pause" | "activate"): string {
  return action === "delete" ? "删除" : action === "pause" ? "暂停" : "激活";
}

function pendingActionLabel(action: BulkAction): string {
  return action === "test-push" ? "发送测试推送到" : actionLabel(action);
}

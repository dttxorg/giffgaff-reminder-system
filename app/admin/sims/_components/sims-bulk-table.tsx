"use client";

import Link from "next/link";
import { useState } from "react";
import { formatRelativeTime } from "@/lib/date";
import { useRouter } from "next/navigation";

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
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

  const submit = async (action: "delete" | "pause" | "activate" | "test-push") => {
    if (selected.size === 0) return;
    if (
      (action === "delete" || action === "test-push") &&
      !confirm(
        action === "delete"
          ? `确认删除 ${selected.size} 个号码?\n\n会级联删除绑定 user 和 reminders_sent,不可恢复。`
          : `确认向 ${selected.size} 个用户发送一次测试推送?\n\n用户的 Sever酱/Bark 等渠道都会收到一条消息(会消耗他们的日配额)。`
      )
    ) {
      return;
    }
    setLoading(true);
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
          kind: fail === 0 ? "success" : "success",
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
      setLoading(false);
    }
  };

  return (
    <>
      {/* 批量操作工具栏 — 仅在有选中时显示 */}
      {totalSelected > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
          <span className="text-sm text-indigo-900 font-medium">
            已选 <strong>{totalSelected}</strong> 个
          </span>
          <button
            type="button"
            onClick={() => submit("test-push")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-indigo-300 text-indigo-800 bg-white hover:bg-indigo-50 disabled:opacity-50 transition-colors"
          >
            测试推送
          </button>
          <button
            type="button"
            onClick={() => submit("activate")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            激活
          </button>
          <button
            type="button"
            onClick={() => submit("pause")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-amber-300 text-amber-800 bg-white hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            暂停
          </button>
          <button
            type="button"
            onClick={() => submit("delete")}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md border border-rose-300 text-rose-800 bg-white hover:bg-rose-50 disabled:opacity-50 transition-colors"
          >
            删除
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-md text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            清除选择
          </button>
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
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{sim.id}</td>
                <td className="px-3 py-2 font-mono">{sim.phoneNumber}</td>
                <td className="px-3 py-2">{sim.activatedAt}</td>
                <td className="px-3 py-2 text-slate-500">{sim.lastPortedAt || "—"}</td>
                <td className="px-3 py-2">
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
                <td className="px-3 py-2 text-xs">
                  <span className="text-slate-700">{sim.channel}</span>
                </td>
                <td className="px-3 py-2 text-xs">
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
    </>
  );
}

function actionLabel(action: "delete" | "pause" | "activate"): string {
  return action === "delete" ? "删除" : action === "pause" ? "暂停" : "激活";
}

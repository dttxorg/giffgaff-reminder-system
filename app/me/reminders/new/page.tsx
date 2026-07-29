import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserDashboardContext } from "@/lib/session";
import { RetainedReminderForm } from "./retained-reminder-form";

export default async function NewRetainedReminderPage() {
  const user = await getCurrentUserDashboardContext(null);
  if (!user) redirect("/login");
  if (user.availableReminderSlots < 1) redirect("/me");

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/me"
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← 返回号码管理
      </Link>
      <div className="mt-3 overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-[0_20px_60px_-32px_rgba(79,70,229,0.45)]">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-5 py-6 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
            已保留提醒权益
          </p>
          <h1 className="mt-2 text-2xl font-bold">填写新的保号号码</h1>
          <p className="mt-2 text-sm leading-6 text-indigo-100">
            当前有 {user.availableReminderSlots} 个提醒名额。提交后沿用原通知渠道，
            无需重新兑换或重新配置推送。
          </p>
        </div>
        <RetainedReminderForm />
      </div>
    </main>
  );
}

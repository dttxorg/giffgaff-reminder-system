import {
  nextBucketAt,
  reminderCountForDay,
  shanghaiParts,
} from "@/lib/bucket";
import { NextPushCountdown } from "./next-push-countdown";
import {
  reminderPolicy,
  type CarrierType,
  type ReminderSchedule,
} from "@/lib/carrier";

interface DayOffsetProgressProps {
  dayOffset: number;
  carrier?: CarrierType;
  reminderStartDay?: number;
  cycleDays?: number;
}

interface ProgressInfo {
  pct: number;
  color: string;
  label: string;
  bucketCount: number;
}

/**
 * 把 dayOffset 映射到一个 0-100 的进度百分比 + 颜色 + 文字标签。
 *
 * 业务规则(与 lib/bucket.COUNTS 保持一致):
 * - 0-169: 静默期
 * - 170-172: 轻度提醒 (1 次/天)
 * - 173-175: 中度提醒 (2 次/天)
 * - 176-178: 高度提醒 (3 次/天)
 * - 179: 临近截止 (5 次/天)
 * - 180: 最后一天 (10 次/天)
 * - >180: 已过期 (系统停止提醒)
 */
export function progressFor(
  dayOffset: number,
  schedule: CarrierType | ReminderSchedule = "giffgaff"
): ProgressInfo {
  const policy = reminderPolicy(schedule);
  if (dayOffset < policy.reminderStartDay) {
    return {
      pct: Math.round(
        (Math.max(0, dayOffset) / Math.max(1, policy.reminderStartDay - 1)) *
          25
      ),
      color: "bg-slate-300",
      label: "静默期",
      bucketCount: 0,
    };
  }
  const daysLeft = policy.cycleDays - dayOffset;
  const bucketCount = reminderCountForDay(dayOffset, schedule);
  if (daysLeft >= 8) {
    return {
      pct: 25,
      color: "bg-amber-400",
      label: "轻度提醒",
      bucketCount,
    };
  }
  if (daysLeft >= 5) {
    return {
      pct: 50 + Math.round(((7 - daysLeft) / 2) * 25),
      color: "bg-amber-500",
      label: "中度提醒",
      bucketCount,
    };
  }
  if (daysLeft >= 2) {
    return {
      pct: 75 + Math.round(((4 - daysLeft) / 2) * 15),
      color: "bg-orange-500",
      label: "高度提醒",
      bucketCount,
    };
  }
  if (daysLeft === 1) {
    return { pct: 95, color: "bg-orange-600", label: "临近截止", bucketCount: 5 };
  }
  if (daysLeft === 0) {
    return { pct: 100, color: "bg-rose-600", label: "最后一天", bucketCount: 10 };
  }
  return { pct: 100, color: "bg-slate-500", label: "已过期", bucketCount: 0 };
}

/**
 * 进度条 + 分段颜色,让用户一眼看出"还差几天""当前处于哪个提醒阶段"。
 */
export function DayOffsetProgress({
  dayOffset,
  carrier = "giffgaff",
  reminderStartDay,
  cycleDays,
}: DayOffsetProgressProps) {
  const schedule = { carrier, reminderStartDay, cycleDays };
  const { pct, color, label, bucketCount } = progressFor(dayOffset, schedule);
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500">保号状态</span>
        <span className="text-xs text-slate-700 font-medium">{label}</span>
      </div>
      <div
        className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`保号状态进度 ${clamped}%`}
      >
        <div
          className={`h-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {bucketCount > 0 && (
        <p className="text-xs text-slate-500 mt-1.5">
          每天发送 {bucketCount} 次
        </p>
      )}
    </div>
  );
}

interface ReminderWindowAlertProps {
  dayOffset: number;
  bucketInfo: { count: number; bucket: number } | null;
  /** Round 137: 当前时间,用于算"距下次推送还有多久" */
  now?: Date;
  carrier?: CarrierType;
  reminderStartDay?: number;
  cycleDays?: number;
}

/**
 * 进入提醒窗口(170-180)时的量化提示:
 * - 还剩几天到截止
 * - 当前处于哪个提醒阶段
 * - 今天会发几次(以及当前是第几个 bucket)
 */
export function ReminderWindowAlert({
  dayOffset,
  bucketInfo,
  now,
  carrier = "giffgaff",
  reminderStartDay,
  cycleDays,
}: ReminderWindowAlertProps) {
  const schedule = { carrier, reminderStartDay, cycleDays };
  const policy = reminderPolicy(schedule);
  const daysLeft = policy.cycleDays - dayOffset;
  const { label, bucketCount } = progressFor(dayOffset, schedule);
  // Round 137: 用上海时区算"下次推送时间"
  const parts = shanghaiParts(now ?? new Date());
  const nextHHMM = nextBucketAt(dayOffset, parts.hour, schedule);
  // Round 139: nextHHMM="00:00" 在 bucketForDay 边界外,可能是"今天 0 点已过"或"明天 0 点"。
  // 简单判断:如果 parts.hour >= 12 且 nextHHMM="00:00",则是明天;否则今天已过
  // (bucketForDay 不会让 hourOfDay 落在最后一个 bucket 之后才返回 0:00,
  //  所以 nextHHMM="00:00" 几乎都是"明天的 bucket 0")
  const isTomorrow = nextHHMM === "00:00";
  return (
    <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
      <div className="font-semibold mb-1 inline-flex items-center gap-1">
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
          已进入保号提醒窗口（{label}）</div>
      <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
        <li>
          距保号截止还有 <strong>{daysLeft} 天</strong>
        </li>
        {bucketInfo ? (
          <li>
            今天第 <strong>{bucketInfo.bucket + 1}</strong> / {bucketInfo.count} 次推送
          </li>
        ) : bucketCount > 0 ? (
          <li>
            今天预计发送 <strong>{bucketCount}</strong> 次
          </li>
        ) : null}
        {nextHHMM && (
          <li>
            下次推送:<strong className="ml-1">{nextHHMM}</strong>
            {/* Round 139: 实时倒计时(每分钟更新) */}
            <NextPushCountdown nextHHMM={nextHHMM} isTomorrow={isTomorrow} />
          </li>
        )}
      </ul>
    </div>
  );
}

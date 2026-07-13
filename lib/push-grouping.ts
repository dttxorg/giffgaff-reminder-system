// Round 175: 推送按日分组(上海时区)纯函数
//
// 业务用例: /me/pushes 按日折叠视图。
// 抽出可测,server component 渲染时直接调。

export interface ReminderForGroup {
  id: number;
  sentAt: Date;
  status: "success" | "failed";
  dayOffset: number;
  bucket: number;
  errorMessage: string | null;
}

export interface DayGroup {
  /** "YYYY-MM-DD" (上海时区) */
  dateKey: string;
  /** "2026年7月13日" (中文展示) */
  label: string;
  reminders: ReminderForGroup[];
}

/**
 * 把推送列表按 sentAt (上海时区日期) 分组。
 * - 倒序 reminders → 倒序 dateKey
 * - 上海时区 (+8) 算日期
 */
export function groupRemindersByDay(
  reminders: ReminderForGroup[]
): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const r of reminders) {
    // +8 算上海时区
    const shanghai = new Date(r.sentAt.getTime() + 8 * 60 * 60 * 1000);
    const y = shanghai.getUTCFullYear();
    const m = shanghai.getUTCMonth() + 1;
    const d = shanghai.getUTCDate();
    const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    let group = groups.find((g) => g.dateKey === dateKey);
    if (!group) {
      group = {
        dateKey,
        label: `${y}年${m}月${d}日`,
        reminders: [],
      };
      groups.push(group);
    }
    group.reminders.push(r);
  }
  return groups;
}

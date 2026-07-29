import {
  reminderPolicy,
  type CarrierType,
  type ReminderSchedule,
} from "./carrier";

/**
 * "已激活 N 天" 显示标签
 *
 * 业务:
 *  - 0/1/2 边界用"今天/昨天/前天" + 灰底绿点的"刚激活"徽标
 *  - 3+ 直接显示数字
 *  - 负数理论上不会出现(激活日期不会晚于今天),但防御性归零
 *
 * 与 sim-card 的渲染解耦,方便单测
 */

export type ActivatedDaysDisplay = {
  /** 显示文本("今天" / "昨天" / "前天" / 数字字符串) */
  text: string;
  /** 是否显示"刚激活"徽标(0/1/2 天) */
  showFreshBadge: boolean;
  /** 显示模式(纯前端用,UI 选颜色) */
  mode: "fresh" | "normal" | "inWindow" | "overdue";
};

/**
 * 0/1/2 边界返回中文标签,3+ 返回数字字符串
 * 业务用例:/me "已激活 N 天" 主数字
 */
export function formatActivatedDays(
  dayOffset: number,
  schedule: CarrierType | ReminderSchedule = "giffgaff"
): ActivatedDaysDisplay {
  // 防御:用户填了未来激活日期(理论上 API 阻止,UI 也限定不能晚于今天)
  // 但 dayOffset 计算走本地时区,边缘情况可能产生 -1/-2
  // 先处理这两个明确边界,再把更小的负数归零
  if (dayOffset === -1) return { text: "明天激活", showFreshBadge: false, mode: "normal" };
  if (dayOffset === -2) return { text: "后天激活", showFreshBadge: false, mode: "normal" };
  if (dayOffset < -2) dayOffset = 0; // 极端防御:归零

  if (dayOffset === 0) return { text: "今天", showFreshBadge: true, mode: "fresh" };
  if (dayOffset === 1) return { text: "昨天", showFreshBadge: true, mode: "fresh" };
  if (dayOffset === 2) return { text: "前天", showFreshBadge: true, mode: "fresh" };

  // 3+ 直接数字
  const policy = reminderPolicy(schedule);
  if (
    dayOffset >= policy.reminderStartDay &&
    dayOffset <= policy.cycleDays
  ) {
    return { text: String(dayOffset), showFreshBadge: false, mode: "inWindow" };
  }
  if (dayOffset > policy.cycleDays) {
    return { text: String(dayOffset), showFreshBadge: false, mode: "overdue" };
  }
  return { text: String(dayOffset), showFreshBadge: false, mode: "normal" };
}

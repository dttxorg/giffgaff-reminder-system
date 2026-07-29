export const CARRIERS = ["giffgaff", "ctexcel"] as const;

export type CarrierType = (typeof CARRIERS)[number];

export interface CarrierPolicy {
  id: CarrierType;
  label: string;
  cycleDays: number;
  reminderStartDay: number;
}

export interface ReminderSchedule {
  carrier?: CarrierType;
  reminderStartDay?: number;
  cycleDays?: number;
}

export const CARRIER_POLICIES: Record<CarrierType, CarrierPolicy> = {
  giffgaff: {
    id: "giffgaff",
    label: "Giffgaff",
    cycleDays: 180,
    reminderStartDay: 170,
  },
  ctexcel: {
    id: "ctexcel",
    label: "CTExcel",
    cycleDays: 90,
    reminderStartDay: 80,
  },
};

export function carrierPolicy(carrier: CarrierType = "giffgaff"): CarrierPolicy {
  return CARRIER_POLICIES[carrier];
}

export function reminderPolicy(
  schedule: CarrierType | ReminderSchedule = "giffgaff"
): CarrierPolicy {
  const carrier =
    typeof schedule === "string" ? schedule : (schedule.carrier ?? "giffgaff");
  const defaults = carrierPolicy(carrier);
  if (typeof schedule === "string") return defaults;
  return {
    ...defaults,
    reminderStartDay: schedule.reminderStartDay ?? defaults.reminderStartDay,
    cycleDays: schedule.cycleDays ?? defaults.cycleDays,
  };
}

/** 距运营商截止日还剩几天；负数表示已经超期。 */
export function daysUntilCarrierDeadline(
  dayOffset: number,
  schedule: CarrierType | ReminderSchedule = "giffgaff"
): number {
  return reminderPolicy(schedule).cycleDays - dayOffset;
}

/** 把不同运营商的提醒日映射到统一的 0..10 阶段。 */
export function reminderStage(
  dayOffset: number,
  schedule: CarrierType | ReminderSchedule = "giffgaff"
): number | null {
  const policy = reminderPolicy(schedule);
  const stage = dayOffset - policy.reminderStartDay;
  return stage >= 0 && dayOffset <= policy.cycleDays ? stage : null;
}

export function isCarrier(value: unknown): value is CarrierType {
  return typeof value === "string" && CARRIERS.includes(value as CarrierType);
}

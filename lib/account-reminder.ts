export const MULTI_SIM_AGGREGATE_THRESHOLD = 3;
const MAX_LISTED_SIMS = 10;

export interface AccountReminderItem {
  id: number;
  phoneNumber: string;
  dayOffset: number;
}

function dashboardUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/me`;
}

/**
 * 4 张及以上活跃号码的账号使用汇总提醒：只展示尾号，正文长度保持有界。
 */
export function buildAccountReminderMessage(
  items: AccountReminderItem[],
  baseUrl: string
): { title: string; body: string } {
  const sorted = [...items].sort(
    (a, b) => b.dayOffset - a.dayOffset || a.id - b.id
  );
  const listed = sorted.slice(0, MAX_LISTED_SIMS);
  const lines = listed.map(
    (item) => `• 尾号 ${item.phoneNumber.slice(-4)} · 已 ${item.dayOffset} 天`
  );
  const remaining = sorted.length - listed.length;
  if (remaining > 0) lines.push(`• 另有 ${remaining} 个号码，请在后台查看`);
  const mostUrgentDays = sorted[0]?.dayOffset ?? 0;

  return {
    title: `Giffgaff 账号保号提醒（${items.length} 个号码）`,
    body: [
      `您的账号中有 ${items.length} 个号码进入保号提醒期：`,
      "",
      ...lines,
      "",
      `当前最接近保号日期的号码已激活 ${mostUrgentDays} 天，账号提醒频率以它为准。`,
      "同一提醒时段内只发送这一条账号汇总，避免按号码重复推送。",
      "请登录后台统一查看并更新保号状态：",
      dashboardUrl(baseUrl),
    ].join("\n"),
  };
}

/** 管理员重发历史汇总记录时，历史号码列表未持久化，只发送计数与后台入口。 */
export function buildAccountReminderResendMessage(
  simCount: number,
  mostUrgentDays: number,
  baseUrl: string
): { title: string; body: string } {
  return {
    title: `Giffgaff 账号保号提醒（${simCount} 个号码）`,
    body: [
      `您的账号中有 ${simCount} 个号码需要检查保号状态。`,
      `当前汇总记录以已激活 ${mostUrgentDays} 天的号码决定提醒频率。`,
      "请登录后台统一查看并处理：",
      dashboardUrl(baseUrl),
    ].join("\n"),
  };
}

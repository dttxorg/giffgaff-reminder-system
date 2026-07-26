import { normalizeCardCode } from "./card-key";
import { parseISOCalendarDate } from "./date";
import { normalizePhone } from "./phone";

export const MAX_BATCH_REDEEM_ITEMS = 50;

export interface BatchRedeemItem {
  line: number;
  code: string;
  phoneNumber: string;
  activatedAt: string;
}

export interface BatchRedeemParseError {
  line: number;
  input: string;
  reason: string;
}

export interface BatchRedeemParseResult {
  items: BatchRedeemItem[];
  errors: BatchRedeemParseError[];
  totalRows: number;
  overflow: number;
}

function isHeader(columns: string[]): boolean {
  const first = columns[0]?.trim().toLowerCase() ?? "";
  const second = columns[1]?.trim().toLowerCase() ?? "";
  return (
    /^(兑换码|卡密|code|redeem[_ ]?code)$/.test(first) &&
    /^(手机号|号码|phone|phone[_ ]?number)$/.test(second)
  );
}

/**
 * 解析客户端批量兑换文本。
 *
 * 每行支持：
 *   兑换码, 手机号, 激活日期
 *   兑换码, 手机号              （使用统一激活日期）
 *
 * 分隔符支持逗号、中文逗号、分号、竖线和 Tab，并允许第一行表头。
 */
export function parseBatchRedeemText(
  input: string,
  fallbackDate: string
): BatchRedeemParseResult {
  const rows = input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter((row) => row.raw.length > 0);

  const items: BatchRedeemItem[] = [];
  const errors: BatchRedeemParseError[] = [];
  const seenCodes = new Set<string>();
  const seenPhones = new Set<string>();
  let totalRows = 0;
  let overflow = 0;

  for (const row of rows) {
    const columns = row.raw.split(/[\t,，;；|]+/).map((value) => value.trim());
    if (totalRows === 0 && isHeader(columns)) continue;
    totalRows += 1;

    if (totalRows > MAX_BATCH_REDEEM_ITEMS) {
      overflow += 1;
      continue;
    }

    if (columns.length < 2 || columns.length > 3) {
      errors.push({
        line: row.line,
        input: row.raw,
        reason: "每行需要“兑换码、手机号、激活日期”三列",
      });
      continue;
    }

    const code = normalizeCardCode(columns[0] ?? "");
    const phoneNumber = normalizePhone(columns[1] ?? "");
    const activatedAt = (columns[2] || fallbackDate).trim();

    if (code.length !== 16) {
      errors.push({
        line: row.line,
        input: row.raw,
        reason: "兑换码不是 16 位",
      });
      continue;
    }
    if (!/^\d{6,15}$/.test(phoneNumber)) {
      errors.push({
        line: row.line,
        input: row.raw,
        reason: "手机号应为 6-15 位数字",
      });
      continue;
    }
    if (!parseISOCalendarDate(activatedAt)) {
      errors.push({
        line: row.line,
        input: row.raw,
        reason: "激活日期应为有效的 YYYY-MM-DD",
      });
      continue;
    }
    if (seenCodes.has(code)) {
      errors.push({
        line: row.line,
        input: row.raw,
        reason: "兑换码在本次导入中重复",
      });
      continue;
    }
    if (seenPhones.has(phoneNumber)) {
      errors.push({
        line: row.line,
        input: row.raw,
        reason: "手机号在本次导入中重复",
      });
      continue;
    }

    seenCodes.add(code);
    seenPhones.add(phoneNumber);
    items.push({
      line: row.line,
      code,
      phoneNumber,
      activatedAt,
    });
  }

  return { items, errors, totalRows, overflow };
}

export function serializeBatchRedeemItems(items: BatchRedeemItem[]): string {
  return items
    .map(
      (item) =>
        `${item.code},${item.phoneNumber},${item.activatedAt}`
    )
    .join("\n");
}

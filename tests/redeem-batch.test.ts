import { describe, expect, it } from "vitest";
import {
  MAX_BATCH_REDEEM_ITEMS,
  parseBatchRedeemText,
  serializeBatchRedeemItems,
} from "../lib/redeem-batch";

const CODE_A = "7K9P-3R4M-8H2X-N5YQ";
const CODE_B = "8W3R-K2NP-9X5T-M7QH";

describe("parseBatchRedeemText", () => {
  it("支持表头、三列数据与统一日期回填", () => {
    const parsed = parseBatchRedeemText(
      `兑换码,手机号,激活日期
${CODE_A},07724 215611,2026-07-01
${CODE_B}\t07724215612`,
      "2026-07-08"
    );

    expect(parsed).toMatchObject({
      totalRows: 2,
      overflow: 0,
      errors: [],
      items: [
        {
          line: 2,
          code: "7K9P3R4M8H2XN5YQ",
          phoneNumber: "07724215611",
          activatedAt: "2026-07-01",
        },
        {
          line: 3,
          code: "8W3RK2NP9X5TM7QH",
          phoneNumber: "07724215612",
          activatedAt: "2026-07-08",
        },
      ],
    });
  });

  it("逐行报告无效日期、重复兑换码和重复手机号", () => {
    const parsed = parseBatchRedeemText(
      `${CODE_A},07724215611,2026-07-01
${CODE_A},07724215612,2026-07-01
${CODE_B},07724215611,2026-07-01
9X5T-M7QH-8W3R-K2NP,07724215613,2026-02-30
9X5T-M7QH-8W3R-K2NP,07724215613,2026-07-01`,
      "2026-07-01"
    );

    expect(parsed.items).toHaveLength(2);
    expect(parsed.errors.map((error) => error.reason)).toEqual([
      "兑换码在本次导入中重复",
      "手机号在本次导入中重复",
      "激活日期应为有效的 YYYY-MM-DD",
    ]);
  });

  it("超过单批上限的行不会进入可提交列表", () => {
    const lines = Array.from(
      { length: MAX_BATCH_REDEEM_ITEMS + 2 },
      (_, index) =>
        `${String(index).padStart(16, "2")},07${String(index).padStart(
          9,
          "0"
        )},2026-07-01`
    );
    const parsed = parseBatchRedeemText(lines.join("\n"), "2026-07-01");

    expect(parsed.totalRows).toBe(MAX_BATCH_REDEEM_ITEMS + 2);
    expect(parsed.overflow).toBe(2);
  });

  it("失败项可序列化回可编辑的标准三列格式", () => {
    const parsed = parseBatchRedeemText(
      `${CODE_A},07724215611,2026-07-01`,
      "2026-07-01"
    );
    expect(serializeBatchRedeemItems(parsed.items)).toBe(
      "7K9P3R4M8H2XN5YQ,07724215611,2026-07-01"
    );
  });
});

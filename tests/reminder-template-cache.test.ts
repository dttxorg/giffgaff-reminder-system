import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (loader: () => Promise<string>) => loader,
  revalidateTag: mocks.revalidateTag,
}));

vi.mock("../lib/db", () => ({
  prisma: {
    setting: { findUnique: mocks.findUnique },
  },
}));

import {
  getCachedReminderTemplate,
  invalidateReminderTemplateCache,
} from "../lib/reminder-template-cache";
import { DEFAULT_TEMPLATE } from "../lib/template";

describe("提醒模板页面缓存", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.revalidateTag.mockReset();
  });

  it("只读取模板 value 并返回数据库配置", async () => {
    mocks.findUnique.mockResolvedValue({ value: "自定义 {{phone}}" });

    await expect(getCachedReminderTemplate()).resolves.toBe(
      "自定义 {{phone}}"
    );
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { key: "reminder_template" },
      select: { value: true },
    });
  });

  it("数据库没有配置时使用默认模板", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(getCachedReminderTemplate()).resolves.toBe(DEFAULT_TEMPLATE);
  });

  it("管理员保存后立即失效模板 tag", () => {
    invalidateReminderTemplateCache();
    expect(mocks.revalidateTag).toHaveBeenCalledWith("reminder-template", {
      expire: 0,
    });
  });
});

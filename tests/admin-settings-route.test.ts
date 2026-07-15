import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  upsert: vi.fn(),
  invalidateReminderTemplateCache: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("../lib/db", () => ({
  prisma: {
    setting: { upsert: mocks.upsert },
  },
}));

vi.mock("../lib/reminder-template-cache", () => ({
  invalidateReminderTemplateCache: mocks.invalidateReminderTemplateCache,
}));

import { POST } from "../app/api/admin/settings/route";

describe("POST /api/admin/settings", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue(true);
  });

  it("写入模板后立即失效页面缓存", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "新模板 {{phone}}" }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { key: "reminder_template" },
      create: { key: "reminder_template", value: "新模板 {{phone}}" },
      update: { value: "新模板 {{phone}}" },
    });
    expect(mocks.invalidateReminderTemplateCache).toHaveBeenCalledOnce();
  });

  it("未授权时不写入也不失效缓存", async () => {
    mocks.getAdminSession.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "新模板" }),
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.invalidateReminderTemplateCache).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  reminderFindUnique: vi.fn(),
  reminderUpdate: vi.fn(),
  settingFindUnique: vi.fn(),
  ensureSimPortToken: vi.fn(),
  sendPush: vi.fn(),
  enforceRateLimits: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));
vi.mock("../lib/db", () => ({
  prisma: {
    reminderSent: {
      findUnique: mocks.reminderFindUnique,
      update: mocks.reminderUpdate,
    },
    setting: { findUnique: mocks.settingFindUnique },
  },
}));
vi.mock("../lib/port-token-db", () => ({
  ensureSimPortToken: mocks.ensureSimPortToken,
}));
vi.mock("../lib/channels", () => ({
  sendPush: mocks.sendPush,
}));
vi.mock("../lib/rate-limit", () => ({
  enforceRateLimits: mocks.enforceRateLimits,
  getClientIp: () => "203.0.113.9",
  rateLimitResponse: vi.fn(),
}));

import { POST } from "../app/api/admin/reminders/[id]/resend/route";

function context(id: number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

function reminder(portToken: string | null) {
  return {
    id: 42,
    channel: "bark",
    channelKey: "",
    aggregateDay: null,
    aggregateSimCount: 1,
    sim: {
      id: 7,
      phoneNumber: "07724215611",
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      lastPortedAt: null,
      portToken,
      channel: "bark",
      channelKey: "https://api.day.app/current-key",
    },
  };
}

describe("POST /api/admin/reminders/[id]/resend", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue(true);
    mocks.settingFindUnique.mockResolvedValue({
      value: "号码 {{phone}}，链接 {{port_url}}",
    });
    mocks.reminderUpdate.mockResolvedValue({});
    mocks.enforceRateLimits.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("旧 SIM 复用已读取的空 token 状态并仅执行补写", async () => {
    mocks.reminderFindUnique.mockResolvedValue(reminder(null));
    mocks.ensureSimPortToken.mockResolvedValue("secure-token");
    mocks.sendPush.mockResolvedValue({ ok: true });

    const response = await POST(
      new Request("http://localhost/api/admin/reminders/42/resend", {
        method: "POST",
      }),
      context(42)
    );

    expect(response.status).toBe(200);
    expect(mocks.ensureSimPortToken).toHaveBeenCalledOnce();
    expect(mocks.ensureSimPortToken).toHaveBeenCalledWith(7, null);
    expect(mocks.sendPush).toHaveBeenCalledWith(
      "bark",
      "https://api.day.app/current-key",
      "Giffgaff 保号提醒",
      expect.stringContaining("http://localhost:3000/p/secure-token")
    );
    expect(mocks.reminderUpdate).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        status: "success",
        errorMessage: null,
        sentAt: expect.any(Date),
      },
    });
  });

  it("已有 token 时不触发补写，并保留失败日志", async () => {
    mocks.reminderFindUnique.mockResolvedValue(reminder("existing-token"));
    mocks.sendPush.mockResolvedValue({
      ok: false,
      errorMessage: "渠道超时",
    });

    const response = await POST(
      new Request("http://localhost/api/admin/reminders/42/resend", {
        method: "POST",
      }),
      context(42)
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({ ok: false, error: "渠道超时" });
    expect(mocks.ensureSimPortToken).not.toHaveBeenCalled();
    expect(mocks.reminderUpdate).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        status: "failed",
        errorMessage: "渠道超时",
        sentAt: expect.any(Date),
      },
    });
  });

  it("汇总提醒重发保持账号级文案并跳转后台", async () => {
    mocks.reminderFindUnique.mockResolvedValue({
      ...reminder("existing-token"),
      aggregateDay: "2026-07-15",
      aggregateSimCount: 6,
    });
    mocks.sendPush.mockResolvedValue({ ok: true });

    const response = await POST(
      new Request("http://localhost/api/admin/reminders/42/resend", {
        method: "POST",
      }),
      context(42)
    );

    expect(response.status).toBe(200);
    expect(mocks.ensureSimPortToken).not.toHaveBeenCalled();
    expect(mocks.sendPush).toHaveBeenCalledWith(
      "bark",
      "https://api.day.app/current-key",
      expect.stringContaining("6 个号码"),
      expect.stringContaining("http://localhost:3000/me")
    );
    expect(mocks.sendPush.mock.calls[0][3]).not.toContain("/p/");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  simFindFirst: vi.fn(),
  simUpdate: vi.fn(),
  simUpdateManyAndReturn: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  sendPush: vi.fn(),
  invalidatePublicSimCache: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
}));

vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    sim: {
      findFirst: mocks.simFindFirst,
      update: mocks.simUpdate,
      updateManyAndReturn: mocks.simUpdateManyAndReturn,
    },
  },
}));

vi.mock("../lib/auth", () => ({
  verifyPassword: mocks.verifyPassword,
  hashPassword: mocks.hashPassword,
}));

vi.mock("../lib/channels", () => ({
  sendPush: mocks.sendPush,
}));

vi.mock("../lib/public-sim-cache", () => ({
  invalidatePublicSimCache: mocks.invalidatePublicSimCache,
}));

import { POST as changePassword } from "../app/api/me/password/route";
import { PATCH as changeActivatedAt } from "../app/api/me/sim/route";
import { POST as changeChannel } from "../app/api/me/channel/route";

function jsonRequest(path: string, method: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("用户设置写接口", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getCurrentUserId.mockResolvedValue(7);
    mocks.userFindUnique.mockResolvedValue({ passwordHash: "old-hash" });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("new-hash");
    mocks.sendPush.mockResolvedValue({ ok: true });
  });

  it("修改密码只查询哈希并使用 Session userId 更新", async () => {
    const response = await changePassword(
      jsonRequest("/api/me/password", "POST", {
        oldPassword: "old-password",
        newPassword: "new-password",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { passwordHash: true },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 } })
    );
  });

  it("修改指定 SIM 日期时在同一次写入中校验归属并失效公开缓存", async () => {
    mocks.simUpdateManyAndReturn.mockResolvedValue([
      { id: 23, portToken: "public-token" },
    ]);

    const response = await changeActivatedAt(
      jsonRequest("/api/me/sim", "PATCH", {
        simId: 23,
        activatedAt: "2026-01-02",
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, simId: 23 });
    expect(mocks.simUpdateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 23, userId: 7 },
        select: { id: true, portToken: true },
      })
    );
    expect(mocks.invalidatePublicSimCache).toHaveBeenCalledWith({
      id: 23,
      portToken: "public-token",
    });
  });

  it("修改他人 SIM 日期仍返回 403", async () => {
    mocks.simUpdateManyAndReturn.mockResolvedValue([]);
    mocks.simFindFirst.mockResolvedValue({ id: 11 });

    const response = await changeActivatedAt(
      jsonRequest("/api/me/sim", "PATCH", {
        simId: 99,
        activatedAt: "2026-01-02",
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.invalidatePublicSimCache).not.toHaveBeenCalled();
  });

  it("账号没有 SIM 时修改日期仍返回 400", async () => {
    mocks.simUpdateManyAndReturn.mockResolvedValue([]);
    mocks.simFindFirst.mockResolvedValue(null);

    const response = await changeActivatedAt(
      jsonRequest("/api/me/sim", "PATCH", {
        simId: 23,
        activatedAt: "2026-01-02",
      })
    );

    expect(response.status).toBe(400);
  });

  it("已测试的渠道保存只需一次带归属条件的写入", async () => {
    mocks.simUpdateManyAndReturn.mockResolvedValue([{ id: 23 }]);

    const response = await changeChannel(
      jsonRequest("/api/me/channel", "POST", {
        simId: 23,
        channel: "bark",
        channelKey: "https://api.day.app/example",
        verified: true,
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, simId: 23 });
    expect(mocks.simUpdateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 23, userId: 7 },
      data: {
        channel: "bark",
        channelKey: "https://api.day.app/example",
      },
      select: { id: true },
    });
    expect(mocks.simFindFirst).not.toHaveBeenCalled();
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("渠道保存无法越权修改其他用户的 SIM", async () => {
    mocks.simUpdateManyAndReturn.mockResolvedValue([]);
    mocks.simFindFirst.mockResolvedValue({ id: 11 });

    const response = await changeChannel(
      jsonRequest("/api/me/channel", "POST", {
        simId: 99,
        channel: "serverchan",
        channelKey: "send-key",
        verified: true,
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.simUpdate).not.toHaveBeenCalled();
  });

  it("账号没有 SIM 时保存渠道仍返回 400", async () => {
    mocks.simUpdateManyAndReturn.mockResolvedValue([]);
    mocks.simFindFirst.mockResolvedValue(null);

    const response = await changeChannel(
      jsonRequest("/api/me/channel", "POST", {
        simId: 23,
        channel: "serverchan",
        channelKey: "send-key",
        verified: true,
      })
    );

    expect(response.status).toBe(400);
  });

  it("未验证渠道先检查归属，不为越权 SIM 发送测试推送", async () => {
    mocks.simFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 11 });

    const response = await changeChannel(
      jsonRequest("/api/me/channel", "POST", {
        simId: 99,
        channel: "serverchan",
        channelKey: "send-key",
        verified: false,
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.sendPush).not.toHaveBeenCalled();
    expect(mocks.simUpdate).not.toHaveBeenCalled();
  });
});

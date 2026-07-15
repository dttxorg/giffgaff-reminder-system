import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({
  status: vi.fn(),
  summary: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getCurrentUserSessionStatus: sessionMocks.status,
  getCurrentUserSessionSummary: sessionMocks.summary,
}));

import { GET } from "../app/api/auth/session/route";

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    sessionMocks.status.mockReset();
    sessionMocks.summary.mockReset();
  });

  it("普通导航只查询 boolean 登录态", async () => {
    sessionMocks.status.mockResolvedValueOnce(true);
    const response = await GET(new Request("http://localhost/api/auth/session"));

    expect(await response.json()).toEqual({ authenticated: true });
    expect(sessionMocks.summary).not.toHaveBeenCalled();
  });

  it("兑换页按需返回用户名和 SIM 数量", async () => {
    sessionMocks.summary.mockResolvedValueOnce({ username: "alice", simCount: 3 });
    const response = await GET(
      new Request("http://localhost/api/auth/session?details=redeem")
    );

    expect(await response.json()).toEqual({
      authenticated: true,
      username: "alice",
      simCount: 3,
    });
    expect(sessionMocks.status).not.toHaveBeenCalled();
  });
});

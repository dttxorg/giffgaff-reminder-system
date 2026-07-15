import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import PortClient, {
  type SimInfo,
} from "../../app/p/[simId]/port-client";

const sim: SimInfo = {
  phoneNumber: "07724215611",
  activatedAt: "2025-01-01",
  lastPortedAt: null,
  dayOffset: 100,
  portToken: "abc123def456ghi789jkl012mno345pq",
};

describe("<PortClient /> initial data", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
  });

  it("首屏直接渲染服务端数据，不发起补取请求", () => {
    render(
      <PortClient
        simIdRaw="abc123def456ghi789jkl012mno345pq"
        initialSim={sim}
      />
    );

    expect(screen.getByText("07724 215611")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("服务端未找到数据时直接显示失效状态", () => {
    render(<PortClient simIdRaw="missing-token-value" initialSim={null} />);

    expect(screen.getByText("未找到该 SIM 卡")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("提交时只请求更新接口", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    render(
      <PortClient
        simIdRaw="abc123def456ghi789jkl012mno345pq"
        initialSim={sim}
      />
    );

    await user.click(screen.getByRole("button", { name: "提交" }));

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/p/abc123def456ghi789jkl012mno345pq/port",
      expect.objectContaining({ method: "POST" })
    );
  });
});

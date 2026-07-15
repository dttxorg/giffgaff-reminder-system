import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditSimClient } from "../../app/admin/sims/[id]/edit-sim-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const initialSim = {
  id: 7,
  phoneNumber: "07724215611",
  activatedAt: "2026-01-02",
  lastPortedAt: null,
  status: "active" as const,
  user: { id: 3, username: "owner" },
  recentReminders: [],
};

describe("<EditSimClient />", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("首屏直接使用服务端数据,挂载时不再请求详情 API", () => {
    render(<EditSimClient initialSim={initialSim} />);

    expect(screen.getByDisplayValue("07724215611")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-01-02")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

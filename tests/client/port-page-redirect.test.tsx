import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// next/navigation stubs
let mockParams: Record<string, string> = { simId: "42" };
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { default: PortPage } = await import("../../app/p/[simId]/port-client");

beforeEach(() => {
  mockReplace.mockReset();
  mockFetch.mockReset();
  mockParams = { simId: "42" };
});

describe("<PortPage /> — P6 redirect (int → portToken)", () => {
  it("数据返回前使用与路由一致的稳定卡片骨架", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<PortPage />);

    expect(
      screen.getByRole("status", { name: "正在加载保号信息" })
    ).toBeInTheDocument();
  });

  it("URL 是 int 且 sim 有 portToken → router.replace 到 token URL", async () => {
    mockParams = { simId: "42" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        phoneNumber: "07724215611",
        activatedAt: "2025-01-01",
        lastPortedAt: null,
        dayOffset: 100,
        portToken: "abc123def456ghi789jkl012mno345pq",
      }),
    });
    render(<PortPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        "/p/abc123def456ghi789jkl012mno345pq"
      )
    );
    // 用了 replace,不是 push
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("URL 是 int 且 sim 无 portToken (老 sim lazy-backfill 前) → 不重定向", async () => {
    mockParams = { simId: "99" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        phoneNumber: "07724215611",
        activatedAt: "2025-01-01",
        lastPortedAt: null,
        dayOffset: 100,
        portToken: null,
      }),
    });
    render(<PortPage />);

    // 等 fetch 解析完(给 useEffect 一点时间)
    await new Promise((r) => setTimeout(r, 50));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("URL 已经是 token → 不重定向", async () => {
    mockParams = { simId: "abc123def456ghi789jkl012mno345pq" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        phoneNumber: "07724215611",
        activatedAt: "2025-01-01",
        lastPortedAt: null,
        dayOffset: 100,
        portToken: "abc123def456ghi789jkl012mno345pq",
      }),
    });
    render(<PortPage />);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("API 返回 404 → 不重定向(setNotFound)", async () => {
    mockParams = { simId: "9999" };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ ok: false }),
    });
    render(<PortPage />);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

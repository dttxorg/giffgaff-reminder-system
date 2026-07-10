import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// next/navigation stubs
let mockParams: Record<string, string> = { simId: "42" };
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}));

// 用 spy 替换 globalThis.fetch
let mockFetch = vi.fn();
const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

const { default: PortPage } = await import("../../app/p/[simId]/page");

beforeEach(() => {
  mockReplace.mockReset();
  mockFetch = vi.fn();
  fetchSpy.mockImplementation(mockFetch);
  mockParams = { simId: "42" };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<PortPage /> — P6 redirect (int → portToken)", () => {
  it("URL 是 int 且 sim 有 portToken → router.replace 到 token URL", async () => {
    mockParams = { simId: "42" };
    mockFetch.mockResolvedValueOnce({
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
    mockFetch.mockResolvedValueOnce({
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
    mockFetch.mockResolvedValueOnce({
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
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ ok: false }),
    });
    render(<PortPage />);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

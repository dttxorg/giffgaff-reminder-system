import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSimByParam: vi.fn(),
  revalidateTag: vi.fn(),
  unstableCache: vi.fn(
    (loader: () => unknown) => loader
  ),
}));

vi.mock("next/cache", () => ({
  unstable_cache: mocks.unstableCache,
  revalidateTag: mocks.revalidateTag,
}));

vi.mock("../lib/port-token-db", () => ({
  findSimByParam: mocks.findSimByParam,
}));

import {
  getCachedPublicSim,
  invalidatePublicSimCache,
} from "../lib/public-sim-cache";

describe("public-sim-cache", () => {
  beforeEach(() => {
    mocks.findSimByParam.mockReset();
    mocks.revalidateTag.mockReset();
    mocks.unstableCache.mockClear();
  });

  it("token 查询使用 5 分钟缓存和独立 tag", async () => {
    mocks.findSimByParam.mockResolvedValueOnce({ id: 1 });
    await getCachedPublicSim("secure-token");

    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-sim", "secure-token"],
      { revalidate: 300, tags: ["public-sim:secure-token"] }
    );
  });

  it("更新时立即失效 id 和 token 两个键", () => {
    invalidatePublicSimCache({ id: 42, portToken: "secure-token" });

    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(
      1,
      "public-sim:42",
      { expire: 0 }
    );
    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(
      2,
      "public-sim:secure-token",
      { expire: 0 }
    );
  });
});

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 每个测试结束后自动清理 DOM,避免跨测试污染
afterEach(() => {
  cleanup();
});

// 静态消除 jsdom 未实现的 API,避免警告
if (typeof window !== "undefined") {
  // matchMedia 在 jsdom 默认未实现,Next.js 客户端代码有时会调
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}

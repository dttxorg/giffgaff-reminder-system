import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest 配置
 *
 * 两个 projects 区分运行环境:
 * - "node": 默认环境,跑纯逻辑(不需 DOM)
 * - "client": jsdom 环境,跑 React 组件测试
 *
 * projects 模式不继承顶层 resolve.alias,必须每个 project 单独设。
 */
const projectAlias = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
};

export default defineConfig({
  test: {
    projects: [
      {
        ...projectAlias,
        test: {
          name: "node",
          include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
          exclude: ["tests/client/**", "node_modules/**"],
          environment: "node",
        },
      },
      {
        ...projectAlias,
        test: {
          name: "client",
          include: ["tests/client/**/*.test.tsx"],
          exclude: ["node_modules/**"],
          environment: "jsdom",
          setupFiles: ["./tests/client/setup.ts"],
          css: false,
        },
      },
    ],
  },
});

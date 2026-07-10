import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

// HomePage 用 prisma 做 social proof count,mock 掉
vi.mock("@/lib/db", () => ({
  prisma: {
    sim: { count: vi.fn().mockResolvedValue(42) },
    reminderSent: { count: vi.fn().mockResolvedValue(100) },
  },
}));

import HomePage from "../../app/page";

/**
 * 辅助:HomePage 是 async server component,返回 Promise<JSX.Element>。
 * 在测试里要 await 一下再 render。
 */
async function renderHome() {
  const Comp = (await HomePage()) as any;
  return render(Comp);
}

describe("<HomePage />", () => {
  it("3 个 feature card 都用 SVG 图标(无 emoji)", async () => {
    const { container } = await renderHome();
    const featureTitles = ["从激活第 170 天起", "越临近越频繁", "Sever酱 / Bark 推送"];
    for (const title of featureTitles) {
      const card =
        Array.from(container.querySelectorAll("h3")).find((h) => h.textContent === title)?.parentElement;
      expect(card, `card for "${title}" should exist`).toBeTruthy();
      const svg = card?.querySelector("svg");
      expect(svg, `card "${title}" should have SVG icon`).toBeTruthy();
    }
  });

  it("SVG 使用 currentColor 描边,跟着父级 text-* 颜色", async () => {
    const { container } = await renderHome();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(3);
    for (const svg of Array.from(svgs).slice(0, 3)) {
      expect(svg.getAttribute("stroke")).toBe("currentColor");
    }
  });

  it("H6:social proof 显示 42 个号码被守护,100 条提醒送达", async () => {
    const { container } = await renderHome();
    const text = container.textContent ?? "";
    expect(text).toContain("42");
    expect(text).toContain("100");
    expect(text).toContain("正在被守护");
  });
});


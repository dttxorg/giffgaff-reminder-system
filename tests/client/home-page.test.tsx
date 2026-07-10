import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import HomePage from "../../app/page";

describe("<HomePage />", () => {
  it("3 个 feature card 都用 SVG 图标(无 emoji)", () => {
    const { container } = render(<HomePage />);
    // 找到 3 个 feature card(根据 h3 文本)
    const featureTitles = ["从激活第 170 天起", "越临近越频繁", "Sever酱 / Bark 推送"];
    for (const title of featureTitles) {
      const card =
        Array.from(container.querySelectorAll("h3")).find((h) => h.textContent === title)?.parentElement;
      expect(card, `card for "${title}" should exist`).toBeTruthy();
      const svg = card?.querySelector("svg");
      expect(svg, `card "${title}" should have SVG icon`).toBeTruthy();
    }
  });

  it("SVG 使用 currentColor 描边,跟着父级 text-* 颜色", () => {
    const { container } = render(<HomePage />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(3);
    for (const svg of Array.from(svgs).slice(0, 3)) {
      expect(svg.getAttribute("stroke")).toBe("currentColor");
    }
  });
});

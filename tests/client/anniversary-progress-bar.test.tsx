import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnniversaryProgressBar } from "../../app/me/_components/anniversary-progress-bar";

describe("<AnniversaryProgressBar />", () => {
  it("渲染 '激活 X 年 Y 天, 距 X+1 周年 N 天'", () => {
    const { container } = render(
      <AnniversaryProgressBar
        progress={{ years: 1, daysLeft: 230, totalDays: 500, daysToNextAnniversary: 230 }}
      />
    );
    expect(container.textContent).toContain("激活");
    expect(container.textContent).toContain("1 年");
    expect(container.textContent).toContain("135 天"); // 500 - 1*365 = 135
    expect(container.textContent).toContain("距 2 周年");
    expect(container.textContent).toContain("230 天");
  });

  it("进度条 role='progressbar' aria-valuenow = (365 - daysLeft) / 365%", () => {
    // 365 - 230 = 135 / 365 = 37%
    render(
      <AnniversaryProgressBar
        progress={{ years: 1, daysLeft: 230, totalDays: 500, daysToNextAnniversary: 230 }}
      />
    );
    const bar = screen.getByRole("progressbar", { name: /激活至今进度/ });
    expect(bar).toHaveAttribute("aria-valuenow", "37");
  });

  it("刚到 N 周年 (daysLeft=365) → 0% 进度", () => {
    render(
      <AnniversaryProgressBar
        progress={{ years: 1, daysLeft: 365, totalDays: 365, daysToNextAnniversary: 365 }}
      />
    );
    const bar = screen.getByRole("progressbar", { name: /激活至今进度/ });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("差 1 天到 N+1 周年 (daysLeft=1) → 100% 进度 (Math.round 99.7)", () => {
    render(
      <AnniversaryProgressBar
        progress={{ years: 1, daysLeft: 1, totalDays: 729, daysToNextAnniversary: 1 }}
      />
    );
    const bar = screen.getByRole("progressbar", { name: /激活至今进度/ });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });

  it("aria-label 包含 '激活至今进度' + '距 N 周年还差 M 天'", () => {
    render(
      <AnniversaryProgressBar
        progress={{ years: 1, daysLeft: 230, totalDays: 500, daysToNextAnniversary: 230 }}
      />
    );
    const bar = screen.getByRole("progressbar", { name: /激活至今进度/ });
    const ariaLabel = bar.getAttribute("aria-label") ?? "";
    expect(ariaLabel).toContain("激活至今进度");
    expect(ariaLabel).toContain("距 2 周年");
    expect(ariaLabel).toContain("230 天");
  });

  it("2 年时显示 '距 3 周年'", () => {
    render(
      <AnniversaryProgressBar
        progress={{ years: 2, daysLeft: 165, totalDays: 930, daysToNextAnniversary: 165 }}
      />
    );
    const bar = screen.getByRole("progressbar", { name: /激活至今进度/ });
    expect(bar.getAttribute("aria-label") ?? "").toContain("距 3 周年");
  });
});

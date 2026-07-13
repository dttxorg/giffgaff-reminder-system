import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnniversaryProgress } from "../../app/me/_components/anniversary-progress";

describe("<AnniversaryProgress />", () => {
  it("渲染 '激活 X 年 Y 天,距下个周年还差 N 天'", () => {
    const { container } = render(
      <AnniversaryProgress
        progress={{ years: 1, daysLeft: 230, totalDays: 500, daysToNextAnniversary: 230 }}
      />
    );
    // 500 - 1*365 = 135
    expect(container.textContent).toContain("1 年 135 天");
    expect(container.textContent).toContain("距下个周年还差 230 天");
  });

  it("2 年时显示 '2 年 X 天'", () => {
    const { container } = render(
      <AnniversaryProgress
        progress={{ years: 2, daysLeft: 165, totalDays: 930, daysToNextAnniversary: 165 }}
      />
    );
    // 930 - 2*365 = 200
    expect(container.textContent).toContain("2 年 200 天");
  });

  it("距下个周年 ≤ 30 天 → amber 高亮", () => {
    render(
      <AnniversaryProgress
        progress={{ years: 1, daysLeft: 15, totalDays: 715, daysToNextAnniversary: 15 }}
      />
    );
    const daysLeftEl = screen.getByText("15");
    expect(daysLeftEl.className).toContain("text-amber-700");
  });

  it("距下个周年 > 30 天 → 默认 slate 配色", () => {
    render(
      <AnniversaryProgress
        progress={{ years: 1, daysLeft: 100, totalDays: 630, daysToNextAnniversary: 100 }}
      />
    );
    const daysLeftEl = screen.getByText("100");
    expect(daysLeftEl.className).toContain("text-slate-500");
  });

  it("整周年 (365 天) → 0 剩余天", () => {
    const { container } = render(
      <AnniversaryProgress
        progress={{ years: 1, daysLeft: 365, totalDays: 365, daysToNextAnniversary: 365 }}
      />
    );
    // 365 - 1*365 = 0
    expect(container.textContent).toContain("1 年 0 天");
  });
});

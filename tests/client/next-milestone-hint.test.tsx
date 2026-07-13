import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextMilestoneHint } from "../../app/me/_components/next-milestone-hint";

describe("<NextMilestoneHint />", () => {
  it("渲染里程碑名 + 距今天数", () => {
    render(
      <NextMilestoneHint
        milestone={{ days: 100, label: "100 天里程碑", short: "百日" }}
        daysLeft={23}
      />
    );
    expect(screen.getByText(/距/)).toBeInTheDocument();
    expect(screen.getByText(/100 天里程碑/)).toBeInTheDocument();
    expect(screen.getByText(/还差/)).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText(/还差/)).toBeInTheDocument();
  });

  it("小里程碑(30 天)且远(剩 15 天)→ 默认 slate 配色", () => {
    render(
      <NextMilestoneHint
        milestone={{ days: 30, label: "30 天里程碑", short: "一个月" }}
        daysLeft={15}
      />
    );
    const hint = screen.getByText(/距/);
    expect(hint.className).toContain("text-slate-500");
  });

  it("大里程碑(365 天)且接近(剩 5 天)→ amber 高亮", () => {
    render(
      <NextMilestoneHint
        milestone={{ days: 365, label: "1 周年里程碑", short: "一年" }}
        daysLeft={5}
      />
    );
    const hint = screen.getByText(/距/);
    expect(hint.className).toContain("text-amber-700");
  });

  it("大里程碑(100 天)且还远(剩 50 天)→ 仍 slate", () => {
    render(
      <NextMilestoneHint
        milestone={{ days: 100, label: "100 天里程碑", short: "百日" }}
        daysLeft={50}
      />
    );
    const hint = screen.getByText(/距/);
    expect(hint.className).toContain("text-slate-500");
  });

  it("hover tooltip 显示完整描述", () => {
    render(
      <NextMilestoneHint
        milestone={{ days: 100, label: "100 天里程碑", short: "百日" }}
        daysLeft={23}
      />
    );
    expect(
      screen.getByTitle("还有 23 天达到 100 天里程碑")
    ).toBeInTheDocument();
  });
});

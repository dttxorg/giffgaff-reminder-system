import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayOffsetProgress } from "../../app/me/_components/day-offset-progress";

describe("<DayOffsetProgress /> 渲染", () => {
  it("dayOffset=0 → 静默期 + 0% 进度 + 无 bucketCount 文字", () => {
    const { container } = render(<DayOffsetProgress dayOffset={0} />);
    expect(screen.getByText("保号状态")).toBeInTheDocument();
    expect(screen.getByText("静默期")).toBeInTheDocument();
    // 进度条 aria-valuenow 是 round((0/169)*25) = 0
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    // bucketCount = 0,不显示 "每天发送 N 次"
    expect(screen.queryByText(/每天发送/)).not.toBeInTheDocument();
  });

  it("dayOffset=100 → 静默期,进度 ~74%", () => {
    const { container } = render(<DayOffsetProgress dayOffset={100} />);
    const bar = container.querySelector('[role="progressbar"]');
    // round((100/169)*25) = 15
    expect(bar).toHaveAttribute("aria-valuenow", "15");
  });

  it("dayOffset=170 → 轻度提醒,进度 25%,每天 1 次", () => {
    const { container } = render(<DayOffsetProgress dayOffset={170} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("轻度提醒")).toBeInTheDocument();
    expect(screen.getByText("每天发送 1 次")).toBeInTheDocument();
  });

  it("dayOffset=175 → 中度提醒,每天 2 次", () => {
    render(<DayOffsetProgress dayOffset={175} />);
    expect(screen.getByText("中度提醒")).toBeInTheDocument();
    expect(screen.getByText("每天发送 2 次")).toBeInTheDocument();
  });

  it("dayOffset=178 → 高度提醒,每天 3 次", () => {
    render(<DayOffsetProgress dayOffset={178} />);
    expect(screen.getByText("高度提醒")).toBeInTheDocument();
    expect(screen.getByText("每天发送 3 次")).toBeInTheDocument();
  });

  it("dayOffset=179 → 临近截止,每天 5 次", () => {
    render(<DayOffsetProgress dayOffset={179} />);
    expect(screen.getByText("临近截止")).toBeInTheDocument();
    expect(screen.getByText("每天发送 5 次")).toBeInTheDocument();
  });

  it("dayOffset=180 → 最后一天,100%,每天 10 次", () => {
    const { container } = render(<DayOffsetProgress dayOffset={180} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("最后一天")).toBeInTheDocument();
    expect(screen.getByText("每天发送 10 次")).toBeInTheDocument();
  });

  it("dayOffset=200 → 已过期,100%,无 bucketCount", () => {
    const { container } = render(<DayOffsetProgress dayOffset={200} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("已过期")).toBeInTheDocument();
    // bucketCount = 0,无 "每天发送"
    expect(screen.queryByText(/每天发送/)).not.toBeInTheDocument();
  });

  it("进度条 inner bar 用对应 color class", () => {
    const { container } = render(<DayOffsetProgress dayOffset={180} />);
    // 180 → bg-rose-600
    const inner = container.querySelector('[role="progressbar"] > div')!;
    expect(inner.className).toContain("bg-rose-600");
    // width 100%
    expect((inner as HTMLElement).style.width).toBe("100%");
  });

  it("aria-label 包含百分比", () => {
    const { container } = render(<DayOffsetProgress dayOffset={170} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute("aria-label", "保号状态进度 25%");
  });
});


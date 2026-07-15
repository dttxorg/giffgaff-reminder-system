/**
 * /me/pushes 顶部 7 日推送频率迷你图 (Round 223)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PushFrequencyStrip } from "../../app/me/_components/push-frequency-strip";

const NOW = new Date("2026-07-15T08:00:00Z");
function day(i: number, count: number, dayOffset: number) {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - (6 - i));
  return { date: d, count, dayOffset };
}

describe("<PushFrequencyStrip />", () => {
  it("空数组 → 渲染 null", () => {
    const { container } = render(<PushFrequencyStrip data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("渲染 7 个柱子(对应 7 天)", () => {
    const data = Array.from({ length: 7 }, (_, i) => day(i, i + 1, 100 + i));
    const { container } = render(<PushFrequencyStrip data={data} />);
    // 7 个 .flex-1 (flex-col) 容器
    const dayCols = container.querySelectorAll(".flex-1.flex.flex-col");
    expect(dayCols.length).toBe(7);
  });

  it("总条数显示(右下角)", () => {
    const data = [day(0, 0, 100), day(1, 3, 101), day(2, 0, 102), day(3, 0, 103)];
    render(<PushFrequencyStrip data={data} />);
    expect(screen.getByText("总 3 条")).toBeInTheDocument();
  });

  it("0 条的柱子仍有最小高度(灰色色块),不消失", () => {
    const data = [day(0, 0, 100), day(1, 5, 101)];
    const { container } = render(<PushFrequencyStrip data={data} />);
    // 第一个柱子 count=0,min-height: 2px
    const bars = container.querySelectorAll('[aria-label*="0 条"]');
    expect(bars.length).toBeGreaterThan(0);
  });

  it("height 比例:最大值的柱子最高", () => {
    const data = [day(0, 1, 100), day(1, 10, 101), day(2, 5, 102)];
    const { container } = render(<PushFrequencyStrip data={data} />);
    // 找 day=1 的柱(10 条)应该是最高
    const bar1 = container.querySelector('[aria-label*=" 10 条"]') as HTMLElement;
    const bar0 = container.querySelector('[aria-label*=" 1 条"]') as HTMLElement;
    expect(bar1.style.height).toBe("100%");
    expect(bar0.style.height).toBe("10%");
  });

  it("dayOffset < 170 → 灰色 (slate-300)", () => {
    const data = [day(0, 0, 50)];
    const { container } = render(<PushFrequencyStrip data={data} />);
    const bar = container.querySelector(".bg-slate-300");
    expect(bar).toBeInTheDocument();
  });

  it("dayOffset 170-178 → amber", () => {
    const data = [day(0, 1, 175)];
    const { container } = render(<PushFrequencyStrip data={data} />);
    expect(container.querySelector(".bg-amber-400")).toBeInTheDocument();
  });

  it("dayOffset 179 → orange", () => {
    const data = [day(0, 5, 179)];
    const { container } = render(<PushFrequencyStrip data={data} />);
    expect(container.querySelector(".bg-orange-500")).toBeInTheDocument();
  });

  it("dayOffset 180 → rose", () => {
    const data = [day(0, 10, 180)];
    const { container } = render(<PushFrequencyStrip data={data} />);
    expect(container.querySelector(".bg-rose-500")).toBeInTheDocument();
  });

  it("title 属性含 dayOffset + count(hover 提示)", () => {
    const data = [day(0, 3, 175)];
    const { container } = render(<PushFrequencyStrip data={data} />);
    const col = container.querySelector('[title*="第 175 天"]');
    expect(col).toBeInTheDocument();
    expect(col?.getAttribute("title")).toContain("3 条");
  });
});

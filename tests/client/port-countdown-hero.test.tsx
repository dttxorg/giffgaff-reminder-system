/**
 * /me 保号窗口 hero 倒计时卡片 (Round 216)
 * 仅在 dayOffset 170-180 窗口期内渲染,其他情况返回 null
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortCountdownHero } from "../../app/me/_components/port-countdown-hero";

const NOW = new Date("2026-07-15T08:00:00Z"); // 固定时间便于测试

// 用"激活日期 + N 天 = NOW"反推基准日,确保 dayOffset = N
function baselineForOffset(days: number): Date {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

describe("<PortCountdownHero />", () => {
  it("窗口期外(dayOffset=0)→ 渲染 null", () => {
    const { container } = render(
      <PortCountdownHero
        baseline={baselineForOffset(0)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("窗口期外(dayOffset=169,差 1 天)→ 渲染 null", () => {
    const { container } = render(
      <PortCountdownHero
        baseline={baselineForOffset(169)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("窗口期外(dayOffset=181,刚过)→ 渲染 null", () => {
    const { container } = render(
      <PortCountdownHero
        baseline={baselineForOffset(181)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("180 天(今天最后一天)→ 显示'今天必须保号'", () => {
    render(
      <PortCountdownHero
        baseline={baselineForOffset(180)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(screen.getByText("今天必须保号")).toBeInTheDocument();
    expect(screen.getByText("立即去保号")).toBeInTheDocument();
  });

  it("179 天(明天是最后一天)→ 显示'明天是最后一天'", () => {
    render(
      <PortCountdownHero
        baseline={baselineForOffset(179)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(screen.getByText("明天是最后一天")).toBeInTheDocument();
  });

  it("178 天(还有 2 天)→ 显示'还有 2 天'", () => {
    render(
      <PortCountdownHero
        baseline={baselineForOffset(178)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(screen.getByText("还有 2 天")).toBeInTheDocument();
  });

  it("170 天(窗口首日)→ 显示'今天开始提醒'", () => {
    render(
      <PortCountdownHero
        baseline={baselineForOffset(170)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(screen.getByText("今天开始提醒")).toBeInTheDocument();
  });

  it("175 天(窗口中段)→ 显示'还有 5 天'", () => {
    render(
      <PortCountdownHero
        baseline={baselineForOffset(175)}
        portToken="abc123"
        simId={1}
        now={NOW}
      />
    );
    expect(screen.getByText("还有 5 天")).toBeInTheDocument();
  });

  it("立即去保号 链接指向 /p/<portToken>", () => {
    render(
      <PortCountdownHero
        baseline={baselineForOffset(180)}
        portToken="myToken123"
        simId={42}
        now={NOW}
      />
    );
    const link = screen.getByRole("link", { name: /立即去保号/ });
    expect(link).toHaveAttribute("href", "/p/myToken123");
  });

  it("portToken 缺失时回退到 /p/<simId>", () => {
    render(
      <PortCountdownHero
        baseline={baselineForOffset(180)}
        portToken={null}
        simId={42}
        now={NOW}
      />
    );
    const link = screen.getByRole("link", { name: /立即去保号/ });
    expect(link).toHaveAttribute("href", "/p/42");
  });

  it("进度条 180/180 = 100%", () => {
    const { container } = render(
      <PortCountdownHero
        baseline={baselineForOffset(180)}
        portToken="abc"
        simId={1}
        now={NOW}
      />
    );
    // 进度条是 div > inner div with width: 100%
    const innerBar = container.querySelector("div[style*='width: 100%']");
    expect(innerBar).toBeInTheDocument();
  });

  it("1:N 多卡场景:每张卡根据各自 baseline 独立判断", () => {
    // 同一页面渲染两张卡,各自 baseline 不同
    const { container: c1 } = render(
      <PortCountdownHero
        baseline={baselineForOffset(50)}
        portToken="t1"
        simId={1}
        now={NOW}
      />
    );
    const { container: c2 } = render(
      <PortCountdownHero
        baseline={baselineForOffset(180)}
        portToken="t2"
        simId={2}
        now={NOW}
      />
    );
    expect(c1.firstChild).toBeNull(); // 50 天,不在窗口
    expect(c2.firstChild).not.toBeNull(); // 180 天,在窗口
  });
});

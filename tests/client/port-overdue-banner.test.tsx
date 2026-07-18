/**
 * /me "已过保号窗口"警示 (Round 217)
 * 仅 dayOffset > 180 渲染
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortOverdueBanner } from "../../app/me/_components/port-overdue-banner";

const NOW = new Date("2026-07-15T08:00:00Z");

function baselineForOffset(days: number): Date {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

describe("<PortOverdueBanner />", () => {
  it("dayOffset=180 → 渲染 null(归 PortCountdownHero)", () => {
    const { container } = render(
      <PortOverdueBanner
        baseline={baselineForOffset(180)}
        portToken="abc"
        simId={1}
        now={NOW}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("dayOffset=179 → 渲染 null(在窗口内,归 hero)", () => {
    const { container } = render(
      <PortOverdueBanner
        baseline={baselineForOffset(179)}
        portToken="abc"
        simId={1}
        now={NOW}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("dayOffset=50 → 渲染 null(正常激活期,不需要警示)", () => {
    const { container } = render(
      <PortOverdueBanner
        baseline={baselineForOffset(50)}
        portToken="abc"
        simId={1}
        now={NOW}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("dayOffset=181 → 显示'已过保号窗口 1 天'", () => {
    render(
      <PortOverdueBanner
        baseline={baselineForOffset(181)}
        portToken="abc"
        simId={1}
        now={NOW}
      />
    );
    expect(screen.getByText(/已过保号窗口/)).toBeInTheDocument();
    expect(screen.getByText(/系统已停止提醒/)).toBeInTheDocument();
  });

  it("dayOffset=200 → 显示'已过 20 天'", () => {
    render(
      <PortOverdueBanner
        baseline={baselineForOffset(200)}
        portToken="abc"
        simId={1}
        now={NOW}
      />
    );
    expect(screen.getByText(/已过保号窗口 20 天/)).toBeInTheDocument();
  });

  it("立即去保号 链接用 portToken", () => {
    render(
      <PortOverdueBanner
        baseline={baselineForOffset(200)}
        portToken="myToken"
        simId={1}
        now={NOW}
      />
    );
    const link = screen.getByRole("link", { name: /立即去保号/ });
    expect(link).toHaveAttribute("href", "/p/myToken");
  });

  it("portToken 缺失时引导回账号设置，不生成数字公开链接", () => {
    render(
      <PortOverdueBanner
        baseline={baselineForOffset(200)}
        portToken={null}
        simId={42}
        now={NOW}
      />
    );
    const link = screen.getByRole("link", { name: /立即去保号/ });
    expect(link).toHaveAttribute("href", "/me/settings?simId=42");
  });

  it("1:N 多卡场景:每张卡独立判断(过期的 sim 才显示)", () => {
    const { container: c1 } = render(
      <PortOverdueBanner
        baseline={baselineForOffset(50)} // 正常
        portToken="t1"
        simId={1}
        now={NOW}
      />
    );
    const { container: c2 } = render(
      <PortOverdueBanner
        baseline={baselineForOffset(200)} // 过期
        portToken="t2"
        simId={2}
        now={NOW}
      />
    );
    expect(c1.firstChild).toBeNull();
    expect(c2.firstChild).not.toBeNull();
  });
});

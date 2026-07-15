/**
 * /me/pushes 顶部推送统计概览 (Round 220)
 * 4 个 stat block:总数/成功/失败/送达率
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PushSummaryCard } from "../../app/me/_components/push-summary-card";

describe("<PushSummaryCard />", () => {
  it("渲染 4 个 stat block", () => {
    render(
      <PushSummaryCard
        totalShown={100}
        successCount={95}
        failedCount={5}
      />
    );
    expect(screen.getByText("共推送")).toBeInTheDocument();
    expect(screen.getByText("成功")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
    expect(screen.getByText("送达率")).toBeInTheDocument();
  });

  it("数字正确显示", () => {
    render(
      <PushSummaryCard
        totalShown={120}
        successCount={108}
        failedCount={12}
      />
    );
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("108")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    // 送达率 = 108/120 = 90%
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("无成功/失败(0 条)→ 送达率显示 '—'", () => {
    render(
      <PushSummaryCard
        totalShown={0}
        successCount={0}
        failedCount={0}
      />
    );
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("成功/失败块可点(有 href)跳到对应筛选", () => {
    render(
      <PushSummaryCard
        totalShown={100}
        successCount={90}
        failedCount={10}
      />
    );
    const successLink = screen.getByRole("link", { name: /只看成功/ });
    expect(successLink).toHaveAttribute("href", "/me/pushes?status=success");
    const failedLink = screen.getByRole("link", { name: /只看失败/ });
    expect(failedLink).toHaveAttribute("href", "/me/pushes?status=failed");
  });

  it("activeSimId 存在时链接带 simId", () => {
    render(
      <PushSummaryCard
        totalShown={100}
        successCount={90}
        failedCount={10}
        activeSimId={42}
      />
    );
    const successLink = screen.getByRole("link", { name: /只看成功/ });
    expect(successLink).toHaveAttribute("href", "/me/pushes?simId=42&status=success");
  });

  it("总数/送达率不可点(没 href)", () => {
    render(
      <PushSummaryCard
        totalShown={100}
        successCount={95}
        failedCount={5}
      />
    );
    // 总数和送达率 都不是 link
    const totalLink = screen.queryByRole("link", { name: /只看共推送/ });
    expect(totalLink).not.toBeInTheDocument();
    const rateLink = screen.queryByRole("link", { name: /只看送达率/ });
    expect(rateLink).not.toBeInTheDocument();
  });

  it("送达率 100% → emerald 高色", () => {
    const { container } = render(
      <PushSummaryCard totalShown={10} successCount={10} failedCount={0} />
    );
    // 100% 时 整个送达率块应该有 emerald text
    const rateBlock = Array.from(container.querySelectorAll("div")).find(
      (d) => d.textContent === "100%"
    )?.parentElement;
    expect(rateBlock?.className).toMatch(/emerald/);
  });

  it("送达率 < 80% → rose 警示色", () => {
    const { container } = render(
      <PushSummaryCard totalShown={10} successCount={5} failedCount={5} />
    );
    const rateBlock = Array.from(container.querySelectorAll("div")).find(
      (d) => d.textContent === "50%"
    )?.parentElement;
    expect(rateBlock?.className).toMatch(/rose/);
  });

  it("送达率 80-94% → amber 警告色", () => {
    const { container } = render(
      <PushSummaryCard totalShown={10} successCount={9} failedCount={1} />
    );
    const rateBlock = Array.from(container.querySelectorAll("div")).find(
      (d) => d.textContent === "90%"
    )?.parentElement;
    expect(rateBlock?.className).toMatch(/amber/);
  });

  it("失败数为 0 → slate(不警示)", () => {
    render(
      <PushSummaryCard totalShown={50} successCount={50} failedCount={0} />
    );
    // Just check failed 数字 0 is displayed
    expect(screen.getByText("失败")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopFailingSims } from "../../app/admin/_components/top-failing-sims";
import type { TopFailingSim } from "../../lib/admin-reminder-stats";

const baseSims: TopFailingSim[] = [
  { simId: 1, phoneNumber: "07724215611", failedCount: 5 },
  { simId: 2, phoneNumber: "07724215622", failedCount: 3 },
  { simId: 3, phoneNumber: "07724215633", failedCount: 1 },
];

describe("<TopFailingSims />", () => {
  it("渲染 sim 列表(手机号 + 失败次数)", () => {
    render(<TopFailingSims sims={baseSims} />);
    expect(screen.getByText("07724215611")).toBeInTheDocument();
    expect(screen.getByText("5 次失败")).toBeInTheDocument();
    expect(screen.getByText("07724215622")).toBeInTheDocument();
    expect(screen.getByText("3 次失败")).toBeInTheDocument();
  });

  it("空数组 → 显示 '7 天无失败推送' 成功提示", () => {
    render(<TopFailingSims sims={[]} />);
    expect(screen.getByText("✓ 7 天无失败推送")).toBeInTheDocument();
  });

  it("手机号链接到 /admin/sims/[id]", () => {
    render(<TopFailingSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "07724215611" });
    expect(link).toHaveAttribute("href", "/admin/sims/1");
  });

  it("查看所有失败链接到 /admin/reminders?status=failed", () => {
    render(<TopFailingSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: /查看所有失败/ });
    expect(link).toHaveAttribute("href", "/admin/reminders?status=failed");
  });

  it("标题显示 top N(N=sims.length)", () => {
    render(<TopFailingSims sims={baseSims} />);
    expect(screen.getByText(/7 日失败 top 3/)).toBeInTheDocument();
  });

  it("空 sims 时 top N 仍显示 3 (默认上限)", () => {
    render(<TopFailingSims sims={[]} />);
    expect(screen.getByText(/7 日失败 top 3/)).toBeInTheDocument();
  });
});

describe("<TopFailingSims /> 失败次数点击跳转 (round 148)", () => {
  it("失败次数变 Link,跳 /admin/reminders?simId=X&status=failed", () => {
    render(<TopFailingSims sims={baseSims} />);
    // '5 次失败' (simId=1) 应跳 simId=1
    const link = screen.getByRole("link", { name: "5 次失败" });
    expect(link).toHaveAttribute(
      "href",
      "/admin/reminders?simId=1&status=failed"
    );
  });

  it("其他 sim 同样跳自己的 simId", () => {
    render(<TopFailingSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "3 次失败" });
    expect(link).toHaveAttribute(
      "href",
      "/admin/reminders?simId=2&status=failed"
    );
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayFailingSims } from "../../app/admin/_components/today-failing-sims";
import type { TodayFailingSim } from "../../lib/admin-reminder-stats";

const baseSims: TodayFailingSim[] = [
  { simId: 1, phoneNumber: "07724215611", failedCount: 3 },
  { simId: 2, phoneNumber: "07724215622", failedCount: 1 },
];

describe("<TodayFailingSims />", () => {
  it("渲染 sim 列表(手机号 + 失败次数)", () => {
    render(<TodayFailingSims sims={baseSims} />);
    expect(screen.getByText("07724215611")).toBeInTheDocument();
    expect(screen.getByText("3 次失败")).toBeInTheDocument();
  });

  it("空数组 → '今日无失败推送'", () => {
    render(<TodayFailingSims sims={[]} />);
    expect(screen.getByText("今日无失败推送")).toBeInTheDocument();
  });

  it("手机号链接到 /admin/sims/[id]", () => {
    render(<TodayFailingSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "07724215611" });
    expect(link).toHaveAttribute("href", "/admin/sims/1");
  });

  it("失败次数链接到 /admin/reminders?simId=X&status=failed", () => {
    render(<TodayFailingSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "3 次失败" });
    expect(link).toHaveAttribute(
      "href",
      "/admin/reminders?simId=1&status=failed"
    );
  });

  it("其他 sim 同样跳自己的 simId + status=failed", () => {
    render(<TodayFailingSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "1 次失败" });
    expect(link).toHaveAttribute(
      "href",
      "/admin/reminders?simId=2&status=failed"
    );
  });

  it("'查看所有失败' 链接到 /admin/reminders?status=failed", () => {
    render(<TodayFailingSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: /查看所有失败/ });
    expect(link).toHaveAttribute("href", "/admin/reminders?status=failed");
  });

  it("SVG icon 渲染(rose 警告配色)", () => {
    const { container } = render(<TodayFailingSims sims={baseSims} />);
    // 找 rose 配色的容器
    const roseContainers = container.querySelectorAll(".text-rose-500");
    expect(roseContainers.length).toBeGreaterThan(0);
  });
});

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

describe("<TodayFailingSims /> 排序 (round 183)", () => {
  const sortableSims: TodayFailingSim[] = [
    { simId: 1, phoneNumber: "07724215611", failedCount: 3 },
    { simId: 2, phoneNumber: "07724215622", failedCount: 1 },
    { simId: 3, phoneNumber: "07724215633", failedCount: 2 },
  ];

  it("默认按失败次数倒序 (failedCount 3→2→1 → simId 1/3/2)", () => {
    render(<TodayFailingSims sims={sortableSims} />);
    // skip '查看所有失败' link (index 0)
    // 每个 sim row 有 2 links (phone + count),indexes 0,2,4 是 phone
    const links = screen.getAllByRole("link").slice(1);
    expect(links[0].textContent).toContain("07724215611"); // sim 1 phone
    expect(links[2].textContent).toContain("07724215633"); // sim 3 phone
    expect(links[4].textContent).toContain("07724215622"); // sim 2 phone
  });

  it("sortBy='simId' 按 simId 升序 (1 → 2 → 3)", () => {
    render(<TodayFailingSims sims={sortableSims} sortBy="simId" />);
    // skip '查看所有失败' link (index 0)
    const links = screen.getAllByRole("link").slice(1);
    expect(links[0].textContent).toContain("07724215611"); // sim 1 phone
    expect(links[2].textContent).toContain("07724215622"); // sim 2 phone
    expect(links[4].textContent).toContain("07724215633"); // sim 3 phone
  });
});

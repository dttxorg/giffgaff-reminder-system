import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MilestoneBanner } from "../../app/me/_components/milestone-banner";

describe("<MilestoneBanner />", () => {
  it("渲染里程碑名 + 使用天数", () => {
    render(
      <MilestoneBanner milestone={{ days: 100, label: "100 天里程碑", short: "百日" }} />
    );
    expect(screen.getByText(/恭喜!100 天里程碑/)).toBeInTheDocument();
    expect(screen.getByText(/您的号码已使用 100 天/)).toBeInTheDocument();
    expect(screen.getByText(/第 180 天截止日/)).toBeInTheDocument();
  });

  it("按号码自定义规则展示 CTExcel 截止日", () => {
    render(
      <MilestoneBanner
        milestone={{ days: 30, label: "30 天里程碑", short: "满月" }}
        cycleDays={90}
      />
    );
    expect(screen.getByText(/第 90 天截止日/)).toBeInTheDocument();
    expect(screen.queryByText(/第 180 天截止日/)).not.toBeInTheDocument();
  });

  it("0 天里程碑也支持 ('已激活')", () => {
    render(
      <MilestoneBanner milestone={{ days: 0, label: "已激活", short: "欢迎使用" }} />
    );
    expect(screen.getByText(/恭喜!已激活/)).toBeInTheDocument();
  });

  it("渲染 SVG 图标(emerald 配色)", () => {
    const { container } = render(
      <MilestoneBanner milestone={{ days: 365, label: "1 周年里程碑", short: "一年" }} />
    );
    // 找到 emerald 配色的容器
    const emeraldContainers = container.querySelectorAll(".text-emerald-600");
    expect(emeraldContainers.length).toBeGreaterThan(0);
  });
});

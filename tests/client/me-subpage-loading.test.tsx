import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsLoading from "../../app/me/settings/loading";
import PushHistoryLoading from "../../app/me/pushes/loading";

describe("/me 子页面加载状态", () => {
  it("设置页使用窄栏表单骨架", () => {
    const { container } = render(<SettingsLoading />);

    expect(screen.getByRole("status", { name: "正在加载设置页" })).toBeInTheDocument();
    expect(container.querySelector(".max-w-md")).toBeInTheDocument();
    expect(container.querySelectorAll(".h-11").length).toBeGreaterThanOrEqual(5);
  });

  it("推送历史使用统计与分组列表骨架", () => {
    const { container } = render(<PushHistoryLoading />);

    expect(
      screen.getByRole("status", { name: "正在加载推送历史" })
    ).toBeInTheDocument();
    expect(container.querySelector(".max-w-2xl")).toBeInTheDocument();
    expect(container.querySelectorAll(".grid-cols-3 > div")).toHaveLength(3);
  });
});

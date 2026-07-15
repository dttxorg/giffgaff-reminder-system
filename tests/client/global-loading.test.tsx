import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GlobalLoading from "../../app/loading";

describe("<GlobalLoading />", () => {
  it("为慢页面切换提供统一且可访问的反馈", () => {
    const { container } = render(<GlobalLoading />);

    expect(screen.getByRole("status", { name: "正在加载页面" })).toBeInTheDocument();
    expect(container.querySelector(".route-loading-bar")).toBeInTheDocument();
    expect(container.querySelector(".route-loading-shell")).toBeInTheDocument();
  });
});

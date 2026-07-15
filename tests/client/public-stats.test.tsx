import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicStatsContent } from "../../app/_components/public-stats";

describe("<PublicStatsContent />", () => {
  it("显示号码和送达数量", () => {
    render(<PublicStatsContent simCount={42} sentCount={100} />);
    expect(screen.getByLabelText("服务使用数据")).toHaveTextContent("已守护 42 个号码");
    expect(screen.getByLabelText("服务使用数据")).toHaveTextContent("已送达 100 条提醒");
  });

  it("没有号码时不渲染辅助统计", () => {
    const { container } = render(<PublicStatsContent simCount={0} sentCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("没有送达记录时只显示号码数量", () => {
    render(<PublicStatsContent simCount={7} sentCount={0} />);
    expect(screen.getByLabelText("服务使用数据")).toHaveTextContent("已守护 7 个号码");
    expect(screen.getByLabelText("服务使用数据")).not.toHaveTextContent("已送达");
  });
});

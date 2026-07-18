import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountReminderMode } from "../../app/me/_components/account-reminder-mode";

describe("<AccountReminderMode />", () => {
  it("说明每日一条汇总策略、号码数量和渠道选择", () => {
    render(<AccountReminderMode simCount={6} />);

    expect(
      screen.getByRole("heading", { name: "已开启账号汇总提醒" })
    ).toBeInTheDocument();
    expect(screen.getByText("每日最多 1 条")).toBeInTheDocument();
    expect(screen.getByText(/当前账号有 6 张活跃 SIM/)).toBeInTheDocument();
    expect(
      screen.getByText(/第一张已配置的推送渠道/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /管理通知渠道/ })).toHaveAttribute(
      "href",
      "/me/settings"
    );
  });
});

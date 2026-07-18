import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountReminderMode } from "../../app/me/_components/account-reminder-mode";

describe("<AccountReminderMode />", () => {
  it("说明最紧急号码频率、号码数量和渠道选择", () => {
    render(<AccountReminderMode simCount={6} />);

    expect(
      screen.getByRole("heading", { name: "已开启账号汇总提醒" })
    ).toBeInTheDocument();
    expect(screen.getByText("按最紧急号码频率")).toBeInTheDocument();
    expect(screen.getByText(/当前账号有 6 张活跃 SIM/)).toBeInTheDocument();
    expect(
      screen.getByText(/提醒频率由最接近保号日期的号码决定/)
    ).toBeInTheDocument();
    expect(screen.getByText(/每个提醒时段只发一条汇总/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /管理通知渠道/ })).toHaveAttribute(
      "href",
      "/me/settings"
    );
  });
});

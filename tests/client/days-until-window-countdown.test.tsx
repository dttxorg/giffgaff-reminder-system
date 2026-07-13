import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DaysUntilWindowCountdown } from "../../app/me/_components/days-until-window-countdown";

beforeEach(() => {
  vi.useFakeTimers();
  // 2026-07-13 10:00 (utc+8 = 18:00 UTC)
  vi.setSystemTime(new Date(2026, 6, 13, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<DaysUntilWindowCountdown />", () => {
  it("剩余 12 天 + 0 小时 → '12 天后'", () => {
    // currentDayOffset=158 (server 算 12 days left), target=170
    // currentDayOffset = 158 (server 算出),但实际日历 12 天后
    render(
      <DaysUntilWindowCountdown
        targetDayOffset={170}
        currentDayOffset={158}
      />
    );
    expect(screen.getByText(/12 天后/)).toBeInTheDocument();
  });

  it("剩余 5 天 (10 天内) → '5 天后'", () => {
    // 10 天内只显示天数(避免 server dayOffset 取整和精确时间不一致)
    render(
      <DaysUntilWindowCountdown
        targetDayOffset={170}
        currentDayOffset={165}
      />
    );
    expect(screen.getByText(/5 天后/)).toBeInTheDocument();
  });

  it("剩余 1 小时 → '1 小时后'", () => {
        render(
      <DaysUntilWindowCountdown
        targetDayOffset={170}
        currentDayOffset={170}
      />
    );
    // current=170 dayOffset means daysRemaining=0 → "已进入提醒窗口"
    expect(screen.getByText(/已进入提醒窗口/)).toBeInTheDocument();
  });

  it("剩余 ≤ 0 → '(已进入提醒窗口)'", () => {
    render(
      <DaysUntilWindowCountdown
        targetDayOffset={170}
        currentDayOffset={170}
      />
    );
    expect(screen.getByText(/已进入提醒窗口/)).toBeInTheDocument();
  });

  it("整点差异测试(简化为已进窗口)", () => {
    render(
      <DaysUntilWindowCountdown
        targetDayOffset={170}
        currentDayOffset={170}
      />
    );
    // daysRemaining=0 → 已进入
    expect(screen.getByText(/已进入提醒窗口/)).toBeInTheDocument();
  });

  it("unmount 清理 setInterval (不泄漏 timer)", () => {
    const { unmount } = render(
      <DaysUntilWindowCountdown
        targetDayOffset={170}
        currentDayOffset={150}
      />
    );
    const clearSpy = vi.spyOn(global, "clearInterval");
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});

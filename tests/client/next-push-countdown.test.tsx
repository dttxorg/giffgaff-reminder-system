import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NextPushCountdown } from "../../app/me/_components/next-push-countdown";

describe("<NextPushCountdown />", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 固定一个时间:2026-07-13 10:30
    vi.setSystemTime(new Date(2026, 6, 13, 10, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("显示 X 小时 Y 分后(2 小时内)", () => {
    render(<NextPushCountdown nextHHMM="12:00" />);
    // 10:30 → 12:00 = 1h30m
    expect(screen.getByText("(1 小时 30 分后)")).toBeInTheDocument();
  });

  it("整小时(无余分钟)→ 只显示 X 小时后", () => {
    render(<NextPushCountdown nextHHMM="13:30" />);
    // 10:30 → 13:30 = 3h0m
    expect(screen.getByText("(3 小时后)")).toBeInTheDocument();
  });

  it("不足 1 小时 → 只显示 N 分后", () => {
    render(<NextPushCountdown nextHHMM="11:00" />);
    // 10:30 → 11:00 = 30m
    expect(screen.getByText("(30 分后)")).toBeInTheDocument();
  });

  it("isTomorrow=true → 显示 '明天 HH:MM'", () => {
    render(<NextPushCountdown nextHHMM="00:00" isTomorrow={true} />);
    expect(screen.getByText("明天 00:00")).toBeInTheDocument();
  });

  it("isTomorrow=true 不显示相对时间", () => {
    render(<NextPushCountdown nextHHMM="08:00" isTomorrow={true} />);
    // 不应该有 "X 小时后" 这种相对描述
    expect(screen.queryByText(/小时后/)).toBeNull();
    expect(screen.queryByText(/分后/)).toBeNull();
    expect(screen.getByText("明天 08:00")).toBeInTheDocument();
  });

  it("60s 后自动重新计算", () => {
    render(<NextPushCountdown nextHHMM="12:00" />);
    expect(screen.getByText("(1 小时 30 分后)")).toBeInTheDocument();
    // 推进 60s → now=10:31 → diff = 1h29m
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("(1 小时 29 分后)")).toBeInTheDocument();
  });

  it("unmount 清理 setInterval(不泄漏 timer)", () => {
    const { unmount } = render(<NextPushCountdown nextHHMM="12:00" />);
    const clearSpy = vi.spyOn(global, "clearInterval");
    unmount();
    // verify clearInterval was called (no specific count, but at least once)
    expect(clearSpy).toHaveBeenCalled();
  });
});

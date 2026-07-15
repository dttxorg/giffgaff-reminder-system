import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    prefetch?: boolean;
    children: ReactNode;
  }) => (
    <a {...props} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

import { HistoryFilterLink } from "../../app/me/_components/history-filter-link";

describe("<HistoryFilterLink />", () => {
  it("动态筛选链接不预取，并标记当前筛选", () => {
    render(
      <HistoryFilterLink
        label="近 30 日"
        href="/me/pushes?from=2026-06-15"
        active
      />
    );

    const link = screen.getByRole("link", { name: "近 30 日" });
    expect(link).toHaveAttribute("data-prefetch", "false");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("失败筛选只在选中时使用告警色", () => {
    const { rerender } = render(
      <HistoryFilterLink
        label="失败"
        href="/me/pushes?status=failed"
        active={false}
        tone="failed"
      />
    );
    expect(screen.getByRole("link", { name: "失败" }).className).not.toContain(
      "bg-rose-600"
    );

    rerender(
      <HistoryFilterLink
        label="失败"
        href="/me/pushes?status=failed"
        active
        tone="failed"
      />
    );
    expect(screen.getByRole("link", { name: "失败" }).className).toContain(
      "bg-rose-600"
    );
  });
});

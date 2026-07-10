import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelpPagination, HELP_ORDER } from "../../app/help/_components";

describe("<HelpPagination />", () => {
  it("当前 serverchan → 上一节 telegram,下一节 bark(循环)", () => {
    render(<HelpPagination current="serverchan" />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/help/telegram");
    expect(links[0]).toHaveTextContent(/上一节.*Telegram/);
    expect(links[1]).toHaveAttribute("href", "/help/bark");
    expect(links[1]).toHaveTextContent(/下一节.*Bark/);
  });

  it("当前 telegram → 上一节 pushplus,下一节 serverchan(回到第一个)", () => {
    render(<HelpPagination current="telegram" />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/help/pushplus");
    expect(links[1]).toHaveAttribute("href", "/help/serverchan");
  });

  it("当前 bark → 上一节 serverchan,下一节 pushplus", () => {
    render(<HelpPagination current="bark" />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/help/serverchan");
    expect(links[1]).toHaveAttribute("href", "/help/pushplus");
  });

  it("nav role 标记为'教程导航'", () => {
    const { container } = render(<HelpPagination current="bark" />);
    const nav = container.querySelector('nav[aria-label="教程导航"]');
    expect(nav).toBeInTheDocument();
  });

  it("HELP_ORDER 4 个 channel 顺序固定", () => {
    expect(HELP_ORDER.map((h) => h.slug)).toEqual([
      "serverchan",
      "bark",
      "pushplus",
      "telegram",
    ]);
  });
});

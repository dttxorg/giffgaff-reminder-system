import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// /help 索引页是 server component (async),需要 await
async function renderHelp() {
  // server component 异步调用后是 React 元素
  const Comp = (await import("../../app/help/page")).default();
  return render(Comp as unknown as React.ReactElement);
}

describe("/help 索引页", () => {
  it("页面标题显示 '选择推送渠道'", async () => {
    await renderHelp();
    expect(screen.getByText("选择推送渠道")).toBeInTheDocument();
  });

  it("表格中 4 个渠道链接到对应 /help/{channel}", async () => {
    const { container } = await renderHelp();
    const expected = [
      { name: "Bark", href: "/help/bark" },
      { name: "Sever酱", href: "/help/serverchan" },
      { name: "pushplus", href: "/help/pushplus" },
      { name: "Telegram", href: "/help/telegram" },
    ];
    for (const { name, href } of expected) {
      // 找表格中(thead/tbody 内)的链接,排除底部"查看所有渠道"等
      const tableLinks = Array.from(
        container.querySelectorAll("table a")
      ) as HTMLAnchorElement[];
      const link = tableLinks.find((a) => a.textContent?.includes(name));
      expect(link, `table link for ${name}`).toBeTruthy();
      expect(link?.getAttribute("href")).toBe(href);
    }
  });

  it("表格 6 列(渠道 / 推到哪 / 难度 / 需要 / 免费额度 / 适合)", async () => {
    const { container } = await renderHelp();
    const headers = container.querySelectorAll("thead th");
    expect(headers.length).toBe(6);
  });

  it("'选哪个?' 推荐块有 4 个建议,每个针对特定用户", async () => {
    const { container } = await renderHelp();
    // 找带边框的 .bg-slate-50 推荐块
    const tipBlock = container.querySelector("div.bg-slate-50.border");
    expect(tipBlock).toBeTruthy();
    expect(tipBlock?.textContent).toContain("iPhone");
    expect(tipBlock?.textContent).toContain("Bark");
    expect(tipBlock?.textContent).toContain("Sever酱");
    expect(tipBlock?.textContent).toContain("Telegram");
  });

  it("Sever酱 / Bark / pushplus / Telegram 4 个难度色块都用对应 class", async () => {
    const { container } = await renderHelp();
    // 难度 badge 颜色
    expect(container.textContent).toContain("极易");
    expect(container.textContent).toContain("简单");
    expect(container.textContent).toContain("中等");
  });
});

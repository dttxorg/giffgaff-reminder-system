import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

// 统计组件单独测试；首页结构测试使用同步替身，避免测试环境执行 async RSC。
vi.mock("@/app/_components/public-stats", () => ({
  PublicStats: () => (
    <p aria-label="服务使用数据">已守护 42 个号码 / 已送达 100 条提醒</p>
  ),
}));

import HomePage from "../../app/page";

/**
 * 辅助:HomePage 是 async server component,返回 Promise<JSX.Element>。
 * 在测试里要 await 一下再 render。
 */
async function renderHome() {
  const Comp = (await HomePage()) as ReactElement;
  return render(Comp);
}

describe("<HomePage />", () => {
  describe("Utility Poster 重构首屏", () => {
    it("首屏同时包含价值说明、登录入口、卡密入口和推送预览", async () => {
      const { container } = await renderHome();
      const hero = container.querySelector("section[aria-labelledby='home-title']");

      expect(hero).toBeInTheDocument();
      expect(hero?.querySelector("#home-title")?.textContent).toContain("到期前");
      expect(hero?.textContent).toContain("Giffgaff");
      expect(hero?.querySelector("a[href='/login']")?.textContent).toContain("登录并管理号码");
      expect(hero?.querySelector("a[href='/redeem']")?.textContent).toContain("使用卡密开通");
      expect(hero?.querySelector("#push-preview-title")?.textContent).toContain("这样的提醒");
    });

    it("推送预览说明收到提醒后的三步操作", async () => {
      const { container } = await renderHome();
      const steps = container.querySelector("ol[aria-label='收到提醒后的操作步骤']");

      expect(steps).toBeInTheDocument();
      expect(steps?.textContent).toContain("打开链接");
      expect(steps?.textContent).toContain("更新日期");
      expect(steps?.textContent).toContain("重新计时");
    });

    it("慢统计位于主操作之后，不会把按钮推离首屏", async () => {
      const { container } = await renderHome();
      const loginLink = container.querySelector("a[href='/login']");
      const stats = container.querySelector("[aria-label='服务使用数据']");

      expect(loginLink).toBeInTheDocument();
      expect(stats).toBeInTheDocument();
      expect(
        loginLink?.compareDocumentPosition(stats as Node) ?? 0
      ).toBeTruthy();
      expect(
        (loginLink?.compareDocumentPosition(stats as Node) ?? 0) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it("推送样例 URL 只是预览文本，不伪装成无 href 的交互链接", async () => {
      const { container } = await renderHome();

      expect(container.querySelectorAll("a:not([href])")).toHaveLength(0);
      expect(container.textContent).toContain("baohao.681218.xyz/p/abc123");
    });

  });

  it("使用方案 3 的海报式设计方向并保留清晰内容顺序", async () => {
    const { container } = await renderHome();
    const page = container.querySelector("[data-design-direction='utility-poster']");
    const timeline = container.querySelector("section[aria-labelledby='reminder-timeline-title']");
    const promotion = container.querySelector("section[aria-labelledby='codex-membership-title']");

    expect(page).toBeInTheDocument();
    expect(timeline).toBeInTheDocument();
    expect(promotion).toBeInTheDocument();
    expect(
      (timeline?.compareDocumentPosition(promotion as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("H6:social proof 显示已守护 42 个号码，100 条提醒送达", async () => {
    const { container } = await renderHome();
    const text = container.textContent ?? "";
    expect(text).toContain("42");
    expect(text).toContain("100");
    expect(text).toContain("已守护");
  });

  describe("Codex 会员代充推广", () => {
    it("展示 Plus、5× Pro 和 20× Pro 三种方案及价格", async () => {
      const { container } = await renderHome();
      const promotion = container.querySelector(
        "section[aria-labelledby='codex-membership-title']"
      );

      expect(promotion).toBeInTheDocument();
      expect(promotion?.querySelector("#codex-membership-title")?.textContent).toContain(
        "Codex 会员代充"
      );
      expect(promotion?.textContent).toContain("Plus");
      expect(promotion?.textContent).toContain("¥130");
      expect(promotion?.textContent).toContain("5× Pro");
      expect(promotion?.textContent).toContain("¥740");
      expect(promotion?.textContent).toContain("20× Pro");
      expect(promotion?.textContent).toContain("¥1,200");
      expect(promotion?.textContent).toContain("官方渠道订阅");
      expect(promotion?.textContent).toContain("本人信用卡代付");
      expect(promotion?.textContent).toContain("30 天质保");
      expect(promotion?.textContent).not.toContain("第三方代充服务");
      expect(promotion?.textContent).not.toContain("非 Codex 官方渠道");
    });

    it("只展示裁剪后的微信二维码，不暴露微信资料", async () => {
      const { container } = await renderHome();
      const qrCode = container.querySelector(
        "img[alt='微信二维码，用于咨询 Codex 会员代充']"
      );
      const text = container.textContent ?? "";

      expect(qrCode).toBeInTheDocument();
      expect(qrCode).toHaveAttribute("src", "/images/codex-wechat-qr.png");
      expect(text).not.toContain("猫不肥");
      expect(text).not.toContain("阿富汗");
    });
  });

  describe("海报式提醒频率时间线", () => {
    it("渲染 5 个时间节点(170/175/178/179/180)", async () => {
      const { container } = await renderHome();
      const ol = container.querySelector("ol[aria-label='保号提醒频率时间线']");
      expect(ol).toBeInTheDocument();
      const items = ol?.querySelectorAll("li");
      expect(items?.length).toBe(5);
      expect(items?.[0]).toHaveAttribute("aria-label", "第 170 天，1 次/天");
      expect(items?.[1]).toHaveAttribute("aria-label", "第 175 天，2 次/天");
      expect(items?.[2]).toHaveAttribute("aria-label", "第 178 天，3 次/天");
      expect(items?.[3]).toHaveAttribute("aria-label", "第 179 天，5 次/天");
      expect(items?.[4]).toHaveAttribute("aria-label", "第 180 天，10 次/天");
    });

    it("每个节点显示提醒频率(1/2/3/5/10 次/天)", async () => {
      const { container } = await renderHome();
      const text = container.textContent ?? "";
      expect(text).toContain("1 次/天");
      expect(text).toContain("2 次/天");
      expect(text).toContain("3 次/天");
      expect(text).toContain("5 次/天");
      expect(text).toContain("10 次/天");
    });

    it("标题:'170 天后，提醒自动开始'", async () => {
      const { container } = await renderHome();
      expect(container.textContent).toContain("170 天后，提醒自动开始");
    });

    it("底部说明:过了 180 天系统停止提醒", async () => {
      const { container } = await renderHome();
      expect(container.textContent).toContain("过了 180 天系统停止提醒");
    });
  });
});

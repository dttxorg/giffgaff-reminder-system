/**
 * /me 页面头部 UserHeader (Round 221)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserHeader } from "../../app/me/_components/user-header";

describe("<UserHeader />", () => {
  describe("首字母", () => {
    it("字母 username → 大写首字", () => {
      const { container } = render(<UserHeader username="alice_2024" simCount={1} />);
      const avatar = container.querySelector("div.bg-gradient-to-br");
      expect(avatar?.textContent).toBe("A");
    });
    it("大写字母 username → 保持大写", () => {
      const { container } = render(<UserHeader username="Bob" simCount={0} />);
      expect(container.querySelector("div.bg-gradient-to-br")?.textContent).toBe("B");
    });
    it("纯数字 username(手机号)→ fallback 'U'", () => {
      const { container } = render(<UserHeader username="07724215611" simCount={1} />);
      expect(container.querySelector("div.bg-gradient-to-br")?.textContent).toBe("U");
    });
    it("含特殊字符的 username → fallback 'U'", () => {
      const { container } = render(<UserHeader username="_under_score" simCount={1} />);
      expect(container.querySelector("div.bg-gradient-to-br")?.textContent).toBe("U");
    });
  });

  describe("用户名展示", () => {
    it("显示完整 username(font-mono)", () => {
      render(<UserHeader username="alice_2024" simCount={1} />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toBe("alice_2024");
      expect(heading.className).toMatch(/font-mono/);
    });
  });

  describe("SIM 卡数文案", () => {
    it("0 张 → 尚未绑定 SIM 卡", () => {
      render(<UserHeader username="alice" simCount={0} />);
      expect(screen.getByText("尚未绑定 SIM 卡")).toBeInTheDocument();
    });
    it("1 张 → 已绑定 1 张 SIM 卡", () => {
      render(<UserHeader username="alice" simCount={1} />);
      expect(screen.getByText("已绑定 1 张 SIM 卡")).toBeInTheDocument();
    });
    it("多张 → 已绑定 N 张 SIM 卡", () => {
      render(<UserHeader username="alice" simCount={5} />);
      expect(screen.getByText("已绑定 5 张 SIM 卡")).toBeInTheDocument();
    });
  });

  describe("在线状态", () => {
    it("有绿色'账号登录态:活跃'小标(aria-label)", () => {
      render(<UserHeader username="alice" simCount={1} />);
      expect(screen.getByLabelText("账号登录态:活跃")).toBeInTheDocument();
    });
  });
});

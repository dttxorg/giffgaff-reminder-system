import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimSettingsPicker } from "../../app/me/settings/sim-settings-picker";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const sims = Array.from({ length: 50 }, (_, index) => ({
  id: index + 1,
  phoneNumber: `0772400${String(index + 1).padStart(4, "0")}`,
  isPrimary: index === 0,
}));

describe("<SimSettingsPicker />", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("单个选择器稳定承载 50 个号码", () => {
    render(<SimSettingsPicker sims={sims} activeSimId={1} />);

    const select = screen.getByRole("combobox", { name: "选择要设置的号码" });
    expect(select.querySelectorAll("option")).toHaveLength(50);
    expect(screen.getByText("1 / 50")).toBeInTheDocument();
    expect(select).toHaveValue("1");
  });

  it("选择号码后只发起一次目标路由切换", async () => {
    const user = userEvent.setup();
    render(<SimSettingsPicker sims={sims} activeSimId={1} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "选择要设置的号码" }),
      "50"
    );

    expect(mockPush).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/me/settings?simId=50");
  });
});

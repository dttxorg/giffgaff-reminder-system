import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CsvImportButton } from "../../app/admin/sims/csv-import-button";

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("<CsvImportButton />", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.unstubAllGlobals();
  });

  it("以可访问的 dialog 打开，并为移动端输入保持 16px 字号", async () => {
    const user = userEvent.setup();
    render(<CsvImportButton />);

    await user.click(screen.getByRole("button", { name: "CSV 导入" }));

    expect(screen.getByRole("dialog", { name: "CSV 导入" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭 CSV 导入" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "CSV 内容" }).className).toContain(
      "text-base"
    );
  });

  it("导入期间显示处理行数并禁止关闭窗口", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<CsvImportButton />);

    await user.click(screen.getByRole("button", { name: "CSV 导入" }));
    await user.type(
      screen.getByRole("textbox", { name: "CSV 内容" }),
      "07724215611,2026-01-15"
    );
    await user.click(screen.getByRole("button", { name: "开始导入" }));

    expect(screen.getByText(/正在校验并导入 1 行/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭 CSV 导入" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "关闭" })).toBeDisabled();
  });
});

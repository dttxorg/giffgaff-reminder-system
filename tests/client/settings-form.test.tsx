import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsForm from "../../app/admin/settings/settings-form";

const mockFetch = vi.fn();
const mockFetchImpl = mockFetch;
vi.spyOn(globalThis, "fetch").mockImplementation((...args: unknown[]) => {
  return mockFetchImpl(...args);
});

const SAMPLE_TEMPLATE = `【Giffgaff 保号提醒】您的号码 {{phone}} 已激活 {{days}} 天。`;

describe("<SettingsForm />", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("初始渲染:展示 textarea + 3 个变量按钮", () => {
    render(<SettingsForm initial={SAMPLE_TEMPLATE} />);
    const ta = screen.getByDisplayValue(SAMPLE_TEMPLATE) as HTMLTextAreaElement;
    expect(ta).toBeInTheDocument();
    // 变量按钮(3 个)
    const buttons = screen.getAllByRole("button", { name: /\{\{[a-z_]+\}\}/ });
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent("{{phone}}");
    expect(buttons[1]).toHaveTextContent("{{days}}");
    expect(buttons[2]).toHaveTextContent("{{port_url}}");
  });

  it("点变量按钮 → 在 textarea 内容里插入该变量", () => {
    render(<SettingsForm initial="原始" />);
    const ta = screen.getByDisplayValue("原始") as HTMLTextAreaElement;
    // 模拟光标在末尾
    fireEvent.click(ta);
    ta.setSelectionRange(2, 2);

    // 点 {{phone}} 按钮
    const phoneBtn = screen.getByRole("button", { name: "{{phone}}" });
    fireEvent.click(phoneBtn);

    // textarea 现在应该是 "原始{{phone}}"
    expect(ta.value).toBe("原始{{phone}}");
  });

  it("初次渲染时(未编辑)不显示 '有未保存的修改'", () => {
    render(<SettingsForm initial={SAMPLE_TEMPLATE} />);
    expect(screen.queryByText(/有未保存的修改/)).not.toBeInTheDocument();
  });

  it("编辑后显示 '有未保存的修改' 提示", () => {
    render(<SettingsForm initial={SAMPLE_TEMPLATE} />);
    const ta = screen.getByDisplayValue(SAMPLE_TEMPLATE) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "新内容" } });
    expect(screen.getByText(/有未保存的修改/)).toBeInTheDocument();
  });
});

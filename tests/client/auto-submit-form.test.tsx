import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoSubmitForm } from "../../app/admin/_components/auto-submit-form";

const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/sims",
}));

beforeEach(() => {
  vi.useFakeTimers();
  mockReplace.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<AutoSubmitForm />", () => {
  it("渲染 children + 应用 className", () => {
    render(
      <AutoSubmitForm className="mb-4 flex gap-2">
        <input name="q" placeholder="搜索" />
        <button type="submit">搜索</button>
      </AutoSubmitForm>
    );
    const form = document.querySelector("form");
    expect(form?.className).toBe("mb-4 flex gap-2");
    expect(screen.getByPlaceholderText("搜索")).toBeInTheDocument();
  });

  it("文本输入在防抖结束后使用局部 replace 导航", () => {
    render(
      <AutoSubmitForm delay={300}>
        <input name="q" />
      </AutoSubmitForm>
    );
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "abc" } });

    act(() => vi.advanceTimersByTime(299));
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(mockReplace).toHaveBeenCalledWith("/admin/sims?q=abc", {
      scroll: false,
    });
  });

  it("连续文本输入只提交最后一次值", () => {
    render(
      <AutoSubmitForm delay={300}>
        <input name="q" />
      </AutoSubmitForm>
    );
    const input = screen.getByRole("textbox");

    fireEvent.input(input, { target: { value: "a" } });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.input(input, { target: { value: "ab" } });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.input(input, { target: { value: "abc" } });
    act(() => vi.advanceTimersByTime(300));

    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith("/admin/sims?q=abc", {
      scroll: false,
    });
  });

  it("select 和 checkbox 变化立即应用", () => {
    render(
      <AutoSubmitForm delay={300}>
        <select name="status" aria-label="状态">
          <option value="">全部</option>
          <option value="active">active</option>
        </select>
        <input type="checkbox" name="bound" value="yes" aria-label="已绑定" />
      </AutoSubmitForm>
    );

    fireEvent.change(screen.getByRole("combobox", { name: "状态" }), {
      target: { value: "active" },
    });
    expect(mockReplace).toHaveBeenLastCalledWith("/admin/sims?status=active", {
      scroll: false,
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "已绑定" }));
    expect(mockReplace).toHaveBeenLastCalledWith(
      "/admin/sims?status=active&bound=yes",
      { scroll: false }
    );
  });

  it("空筛选值不会写入 URL，并自然重置分页", () => {
    render(
      <AutoSubmitForm>
        <select name="status" aria-label="状态" defaultValue="active">
          <option value="">全部</option>
          <option value="active">active</option>
        </select>
      </AutoSubmitForm>
    );

    fireEvent.change(screen.getByRole("combobox", { name: "状态" }), {
      target: { value: "" },
    });
    expect(mockReplace).toHaveBeenCalledWith("/admin/sims", { scroll: false });
  });

  it("unmount 会清理尚未触发的文本定时器", () => {
    const { unmount } = render(
      <AutoSubmitForm delay={300}>
        <input name="q" />
      </AutoSubmitForm>
    );
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "abc" } });
    unmount();
    act(() => vi.advanceTimersByTime(1000));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("显式提交立即导航，不等待防抖", () => {
    render(
      <AutoSubmitForm delay={300}>
        <input name="q" defaultValue="abc" />
        <button type="submit">搜索</button>
      </AutoSubmitForm>
    );

    fireEvent.submit(screen.getByRole("button", { name: "搜索" }).closest("form")!);
    expect(mockReplace).toHaveBeenCalledWith("/admin/sims?q=abc", {
      scroll: false,
    });
  });
});

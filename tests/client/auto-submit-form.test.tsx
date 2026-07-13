import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutoSubmitForm } from "../../app/admin/_components/auto-submit-form";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  // 还原 prototype 上的 spy,避免跨测试污染(spyOn HTMLFormElement.prototype 是共享的)
  vi.restoreAllMocks();
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
    expect(form).not.toBeNull();
    expect(form?.className).toBe("mb-4 flex gap-2");
    expect(screen.getByPlaceholderText("搜索")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索" })).toBeInTheDocument();
  });

  it("input 变化 → debounce delay 后自动 submit", () => {
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit");
    render(
      <AutoSubmitForm delay={300}>
        <input name="q" />
      </AutoSubmitForm>
    );
    const input = screen.getByRole("textbox");

    fireEvent.input(input, { target: { value: "abc" } });
    // 299ms: 还没提交
    vi.advanceTimersByTime(299);
    expect(submitSpy).not.toHaveBeenCalled();
    // 再过 1ms: 提交
    vi.advanceTimersByTime(1);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it("多次连续 input → 只在最后 debounce 结束后提交一次", () => {
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit");
    render(
      <AutoSubmitForm delay={300}>
        <input name="q" />
      </AutoSubmitForm>
    );
    const input = screen.getByRole("textbox");

    fireEvent.input(input, { target: { value: "a" } });
    vi.advanceTimersByTime(100);
    fireEvent.input(input, { target: { value: "ab" } });
    vi.advanceTimersByTime(100);
    fireEvent.input(input, { target: { value: "abc" } });
    vi.advanceTimersByTime(100);
    // 共 300ms 但中间每次 fireEvent.input 都重置 timer,所以还没触发
    expect(submitSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it("select change → debounce 后自动 submit", () => {
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit");
    render(
      <AutoSubmitForm delay={300}>
        <select name="status">
          <option value="">全部</option>
          <option value="active">active</option>
        </select>
      </AutoSubmitForm>
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "active" } });
    vi.advanceTimersByTime(300);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it("初始渲染不触发 submit", () => {
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit");
    render(
      <AutoSubmitForm delay={300}>
        <input name="q" defaultValue="预设值" />
      </AutoSubmitForm>
    );
    vi.advanceTimersByTime(1000);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("unmount 清理 pending timer(不泄漏)", () => {
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit");
    const { unmount } = render(
      <AutoSubmitForm delay={300}>
        <input name="q" />
      </AutoSubmitForm>
    );
    const input = screen.getByRole("textbox");
    fireEvent.input(input, { target: { value: "abc" } });
    // 还没到 debounce 时间就 unmount
    vi.advanceTimersByTime(100);
    unmount();
    // 再 advance 不应该触发 submit(timer 已被 clear)
    vi.advanceTimersByTime(1000);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("显式点 submit 按钮 → 走原生 form 提交(不依赖我的 debounce 逻辑)", () => {
    // jsdom 不实现 form.requestSubmit(),所以点击 submit 按钮实际不会触发
    // HTMLFormElement.submit()(浏览器原生走 requestSubmit 路径)。
    // 真实浏览器里点 submit 按钮会自然提交 form,无需我手动调 submit()。
    // 这里只断言:点按钮不会触发我的 debounce 定时器。
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
    render(
      <AutoSubmitForm delay={300}>
        <input name="q" />
        <button type="submit">搜索</button>
      </AutoSubmitForm>
    );
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    vi.advanceTimersByTime(500);
    // 我的 listener 只听 input/change,button click 不会触发
    expect(submitSpy).toHaveBeenCalledTimes(0);
  });

  it("不同 input 控件: checkbox change 也能触发", () => {
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit");
    render(
      <AutoSubmitForm delay={200}>
        <input type="checkbox" name="enabled" />
      </AutoSubmitForm>
    );
    const cb = screen.getByRole("checkbox");
    fireEvent.click(cb); // click 触发 change 事件
    vi.advanceTimersByTime(200);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });
});

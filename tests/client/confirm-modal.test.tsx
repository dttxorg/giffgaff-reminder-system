import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "../../app/_components/confirm-modal";

describe("<ConfirmModal />", () => {
  it("open=false 时不渲染任何内容", () => {
    const { container } = render(
      <ConfirmModal
        open={false}
        title="不会显示"
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("open=true 时显示标题 + 描述 + 按钮", () => {
    render(
      <ConfirmModal
        open={true}
        title="删除用户 #1"
        description="这是一个不可逆操作"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("删除用户 #1")).toBeInTheDocument();
    expect(screen.getByText("这是一个不可逆操作")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });

  it("点确认 → onConfirm 调用 1 次", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmModal open={true} title="t" onConfirm={onConfirm} onClose={onClose} />
    );
    await user.click(screen.getByRole("button", { name: "确认" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("点取消 → onClose 调用 1 次,onConfirm 不调用", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmModal open={true} title="t" onConfirm={onConfirm} onClose={onClose} />
    );
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("点遮罩 → onClose 调用 1 次(loading 时不响应)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    // 非 loading:点遮罩会关闭
    const { rerender } = render(
      <ConfirmModal open={true} title="t" onConfirm={() => {}} onClose={onClose} />
    );
    // 遮罩是带 role="dialog" 的外层 div,点击它(非内部 stopPropagation 的卡片)
    const dialog = screen.getByRole("dialog");
    await user.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);

    // loading:点遮罩不响应
    onClose.mockClear();
    rerender(
      <ConfirmModal
        open={true}
        title="t"
        onConfirm={() => {}}
        onClose={onClose}
        loading={true}
      />
    );
    const dialog2 = screen.getByRole("dialog");
    await user.click(dialog2);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Esc 关闭(loading 时不响应)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <ConfirmModal open={true} title="t" onConfirm={() => {}} onClose={onClose} />
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(
      <ConfirmModal
        open={true}
        title="t"
        onConfirm={() => {}}
        onClose={onClose}
        loading={true}
      />
    );
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("loading=true 时点确认按钮不触发 onConfirm(被 disable)", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="t"
        onConfirm={onConfirm}
        onClose={() => {}}
        loading={true}
      />
    );
    const btn = screen.getByRole("button", { name: /处理中|确认/ });
    // 按钮被 disabled,userEvent.click 会拒绝点
    expect(btn).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("a11y: 有 role=dialog + aria-modal + aria-labelledby", () => {
    render(
      <ConfirmModal open={true} title="重要操作" onConfirm={() => {}} onClose={() => {}} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "confirm-modal-title");
    // titleId 指向的标题存在
    const labelledTitle = document.getElementById("confirm-modal-title");
    expect(labelledTitle).toBeInTheDocument();
    expect(labelledTitle?.textContent).toBe("重要操作");
  });

  it("tone=danger 时确认按钮用 rose 样式;默认/primary 用 indigo", () => {
    const { rerender } = render(
      <ConfirmModal
        open={true}
        title="t"
        tone="danger"
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "确认" }).className).toContain(
      "bg-rose-600"
    );

    rerender(
      <ConfirmModal open={true} title="t" onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.getByRole("button", { name: "确认" }).className).toContain(
      "bg-indigo-600"
    );
  });

  it("description 可以是 ReactNode(列表/代码块等)", () => {
    render(
      <ConfirmModal
        open={true}
        title="删除号码"
        description={
          <>
            <p>会级联删除:</p>
            <ul>
              <li>绑定 user</li>
              <li>推送历史</li>
            </ul>
          </>
        }
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("绑定 user")).toBeInTheDocument();
    expect(screen.getByText("推送历史")).toBeInTheDocument();
  });
});
"use client";

// Round 129: admin 搜索表单自动提交(N5 findings 残留)
// - 监听 form 上的 change/input 事件 → 300ms debounce → form.submit()
// - 输入框(text)用 input 事件,select/checkbox/radio 用 change 事件
// - 用 server action 替代手写 submit()?暂不:N5 范围最小,直接 submit() 沿用
//   现有 query param 路由最简单
// - 保留"搜索"按钮作为兜底(用户按 Enter 也能提交)

import { useEffect, useRef, type ReactNode } from "react";

interface AutoSubmitFormProps {
  /** 防抖延迟(ms),默认 300 */
  delay?: number;
  /** 提交时附加的 className */
  className?: string;
  children: ReactNode;
}

export function AutoSubmitForm({
  delay = 300,
  className,
  children,
}: AutoSubmitFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const scheduleSubmit = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // submit() 触发 form action + 同步所有 input 值,保留 query param 路由
        form.submit();
      }, delay);
    };

    // input 事件:text / search 输入
    // change 事件:select / checkbox / radio
    // 两者结合覆盖所有表单控件
    form.addEventListener("input", scheduleSubmit);
    form.addEventListener("change", scheduleSubmit);

    return () => {
      form.removeEventListener("input", scheduleSubmit);
      form.removeEventListener("change", scheduleSubmit);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delay]);

  return (
    <form ref={formRef} className={className}>
      {children}
    </form>
  );
}

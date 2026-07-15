"use client";

// 后台筛选表单：文本输入防抖，选择类控件即时使用 App Router 局部导航。
// 不调用 form.submit()，避免每次筛选都整页刷新。

import {
  useCallback,
  useEffect,
  useRef,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

interface AutoSubmitFormProps {
  /** 文本输入防抖延迟(ms),默认 450 */
  delay?: number;
  /** 提交时附加的 className */
  className?: string;
  children: ReactNode;
}

export function AutoSubmitForm({
  delay = 450,
  className,
  children,
}: AutoSubmitFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const cancelScheduledSubmit = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const navigateWithForm = useCallback(() => {
    const form = formRef.current;
    if (!form) return;

    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string" && value !== "") {
        params.append(key, value);
      }
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }, [pathname, router]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const scheduleTextSubmit = (event: Event) => {
      const target = event.target;
      const isTextControl =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement &&
          (target.type === "text" || target.type === "search"));
      if (!isTextControl) return;

      cancelScheduledSubmit();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        navigateWithForm();
      }, delay);
    };

    const submitSelection = (event: Event) => {
      const target = event.target;
      const isTextControl =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement &&
          (target.type === "text" || target.type === "search"));
      if (isTextControl) return;

      cancelScheduledSubmit();
      navigateWithForm();
    };

    form.addEventListener("input", scheduleTextSubmit);
    form.addEventListener("change", submitSelection);

    return () => {
      form.removeEventListener("input", scheduleTextSubmit);
      form.removeEventListener("change", submitSelection);
      cancelScheduledSubmit();
    };
  }, [cancelScheduledSubmit, delay, navigateWithForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    cancelScheduledSubmit();
    navigateWithForm();
  };

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={handleSubmit}
      aria-busy={isPending}
    >
      {children}
      {isPending && (
        <span
          className="inline-flex min-h-10 items-center text-xs font-medium text-indigo-700"
          role="status"
          aria-live="polite"
        >
          正在筛选…
        </span>
      )}
    </form>
  );
}

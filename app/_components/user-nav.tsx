"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * 根导航先静态渲染“登录”，水合后再用轻量接口确认登录态。
 * 这样首页 / 帮助页不再因为根布局读取 Cookie 而被强制动态渲染。
 */
export function UserNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedUserPage = pathname === "/me" || pathname.startsWith("/me/");
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const authenticated = isProtectedUserPage || sessionAuthenticated;

  useEffect(() => {
    // /me 本身已经经过服务端鉴权，不再水合后重复查一次 Session。
    if (isProtectedUserPage) return;

    let active = true;
    const controller = new AbortController();

    void fetch("/api/auth/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .then((data: { authenticated?: boolean }) => {
        if (active) setSessionAuthenticated(data.authenticated === true);
      })
      .catch(() => {
        if (active) setSessionAuthenticated(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isProtectedUserPage]);

  const handleLogout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) return;
      setSessionAuthenticated(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  if (authenticated) {
    return (
      <div className="flex min-h-8 min-w-36 items-center justify-end gap-1">
        <Link
          href="/me"
          className="rounded-md px-3 py-1.5 transition-colors hover:bg-slate-100"
        >
          用户中心
        </Link>
        <form onSubmit={handleLogout}>
          <button
            type="submit"
            disabled={loggingOut}
            aria-busy={loggingOut}
            className="rounded-md px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:text-slate-400"
          >
            {loggingOut ? "退出中" : "退出"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-8 min-w-36 items-center justify-end">
      <Link
        href="/login"
        className="rounded-md px-3 py-1.5 transition-colors hover:bg-slate-100"
      >
        登录
      </Link>
    </div>
  );
}

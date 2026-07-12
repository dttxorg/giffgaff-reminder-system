"use client";

/**
 * 404/任意 admin 页: 返回上一页 按钮
 *
 * 用 history.back() 而不是 Link,因为:
 * - 上一页可能是任意 admin 子页(我们知道是 admin context)
 * - history.back() 自然回退到 referrer,不写死路径
 *
 * 如果 referrer 不存在或不在本站(直接打开 url),降级为 /admin 仪表盘。
 */
export function NotFoundBackButton() {
  const onClick = () => {
    // history.length === 1 表示用户直接打开了当前 URL(没有上一页)
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/admin";
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
    >
      ← 返回上一页
    </button>
  );
}
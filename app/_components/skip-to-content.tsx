/**
 * 无障碍 "跳到主要内容" 链接
 *
 * 用法: 在 layout 顶部 <body> 里第一个放 <SkipToContent />。
 * 视觉上默认隐藏,键盘用户按 Tab 时第一个焦点就是这个链接,回车后
 * 跳到 #main-content(由 <main id="main-content"> 标识)。
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
    >
      跳到主要内容
    </a>
  );
}

/**
 * 简单的 loading spinner,只用一个内联 svg 转。
 * 大小通过 size prop 控制,className 可附加颜色等。
 */
export function Spinner({
  size = 16,
  className = "",
  label = "加载中",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-slate-500 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="animate-spin"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.25"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

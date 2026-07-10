import Link from "next/link";

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * 外部链接(同 _blank):末尾加外部图标 + aria 提示 "在新窗口打开",
 * 让用户清楚点击后会跳走。
 */
export function ExternalLink({ href, children, className = "" }: ExternalLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {children}
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="opacity-60"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      <span className="sr-only">(在新窗口打开)</span>
    </Link>
  );
}

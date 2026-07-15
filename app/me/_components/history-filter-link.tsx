import Link from "next/link";

export function HistoryFilterLink({
  label,
  href,
  active,
  tone = "default",
}: {
  label: string;
  href: string;
  active: boolean;
  tone?: "default" | "success" | "failed";
}) {
  const activeClass =
    tone === "success"
      ? "bg-emerald-600 text-white"
      : tone === "failed"
        ? "bg-rose-600 text-white"
        : "bg-indigo-600 text-white";
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-8 items-center rounded-lg px-2.5 py-1 font-medium transition-colors ${
        active ? activeClass : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

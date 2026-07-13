"use client";
import { ErrorFallback } from "../_components/error-fallback";
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} homeHref="/admin" scope="管理后台" />;
}

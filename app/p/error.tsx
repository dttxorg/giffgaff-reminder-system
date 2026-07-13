"use client";
import { ErrorFallback } from "../_components/error-fallback";
export default function PortError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} homeHref="/" scope="保号页面" />;
}

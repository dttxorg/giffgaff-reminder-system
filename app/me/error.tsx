"use client";
import { ErrorFallback } from "../_components/error-fallback";
export default function MeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} homeHref="/me" scope="用户中心" />;
}

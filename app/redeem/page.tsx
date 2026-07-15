import { Suspense } from "react";
import { RedeemExperience } from "./redeem-experience";

export default function RedeemPage() {
  return (
    <Suspense fallback={<RedeemPageFallback />}>
      <RedeemExperience />
    </Suspense>
  );
}

function RedeemPageFallback() {
  return (
    <div
      className="mx-auto max-w-md px-4 py-8 sm:py-12"
      role="status"
      aria-label="正在准备卡密兑换"
    >
      <span className="sr-only">正在准备卡密兑换</span>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 h-12 w-12 animate-pulse rounded-xl bg-indigo-100" />
        <div className="mx-auto h-8 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mx-auto mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-10 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 h-52 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

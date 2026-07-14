import { RedeemClient } from "./redeem-client";
import { RedeemStepIndicator } from "./_components/redeem-step-indicator";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function RedeemPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  // 有初始 code 时跳过第 1 步,直接进入第 2 步(校验中)
  const initialStep: 1 | 2 | 3 = code ? 2 : 1;
  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      {/* 顶部 header:logo + 标题 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-3">
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
            <path d="M13 5v14" strokeDasharray="2 2" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">兑换卡密</h1>
        <p className="text-slate-600 text-sm">
          输入您的卡密,绑定 Giffgaff SIM 卡保号提醒
        </p>
      </div>

      {/* 步骤进度:3 步,清晰告诉用户在哪一步 */}
      <RedeemStepIndicator step={initialStep} />

      <RedeemClient initialCode={code || ""} />
    </div>
  );
}

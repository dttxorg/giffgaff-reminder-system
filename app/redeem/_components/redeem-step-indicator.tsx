interface RedeemStepIndicatorProps {
  /** 当前步骤: 1 = 输入卡密, 2 = 填信息, 3 = 完成 */
  step: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: "输入卡密" },
  { n: 2, label: "填信息" },
  { n: 3, label: "完成" },
] as const;

/**
 * 兑换流程的 3 步进度条
 *
 * 视觉:
 * - 数字 + 文字,已完成步骤 indigo 实心 + ✓,未完成灰色
 * - 当前步骤 indigo 边框 + indigo 数字
 * - 步骤之间用线连,完成的连线实色
 */
export function RedeemStepIndicator({ step }: RedeemStepIndicatorProps) {
  return (
    <ol
      className="flex items-center justify-between mb-6 px-2"
      aria-label={`兑换进度:第 ${step} 步 / 共 3 步`}
    >
      {STEPS.map((s, i) => {
        const done = step > s.n;
        const current = step === s.n;
        return (
          <li
            key={s.n}
            className={`flex items-center ${
              i < STEPS.length - 1 ? "flex-1" : ""
            }`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                  done
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : current
                    ? "bg-white border-indigo-600 text-indigo-600"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
                aria-current={current ? "step" : undefined}
                aria-label={
                  done ? "已完成" : current ? "当前" : "未开始"
                }
              >
                {done ? (
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              <span
                className={`text-xs mt-1.5 ${
                  done
                    ? "text-indigo-700 font-medium"
                    : current
                    ? "text-indigo-700 font-medium"
                    : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 -mt-5 ${
                  step > s.n ? "bg-indigo-600" : "bg-slate-200"
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

import { RedeemClient } from "./redeem-client";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function RedeemPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">兑换卡密</h1>
        <p className="text-slate-600 text-sm">
          输入您的卡密,绑定 Giffgaff SIM 卡保号提醒
        </p>
      </div>
      <RedeemClient initialCode={code || ""} />
    </div>
  );
}
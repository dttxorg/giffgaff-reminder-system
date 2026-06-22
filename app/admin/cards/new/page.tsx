import { requireAdmin } from "@/lib/admin-guard";
import { NewCardClient } from "./new-client";

export default async function NewCardPage() {
  await requireAdmin();
  return (
    <div className="p-6 sm:p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">生成卡密</h1>
      <NewCardClient />
    </div>
  );
}
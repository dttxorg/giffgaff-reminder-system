import { requireAdmin } from "@/lib/admin-guard";
import { ImportCardClient } from "./import-client";

export default async function ImportCardPage() {
  await requireAdmin();
  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">批量导入卡密</h1>
      <ImportCardClient />
    </div>
  );
}

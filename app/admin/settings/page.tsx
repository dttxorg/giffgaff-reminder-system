import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { DEFAULT_TEMPLATE } from "@/lib/template";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const setting = await prisma.setting.findUnique({ where: { key: "reminder_template" } });
  const initial = setting?.value || DEFAULT_TEMPLATE;

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">文案设置</h1>
      <SettingsForm initial={initial} />
    </div>
  );
}

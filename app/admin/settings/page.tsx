import { requireAdmin } from "@/lib/admin-guard";
import { getCachedReminderTemplate } from "@/lib/reminder-template-cache";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const initial = await getCachedReminderTemplate();

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">文案设置</h1>
      <SettingsForm initial={initial} />
    </div>
  );
}

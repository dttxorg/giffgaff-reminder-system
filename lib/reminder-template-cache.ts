import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "./db";
import { DEFAULT_TEMPLATE } from "./template";

const REMINDER_TEMPLATE_TAG = "reminder-template";

/**
 * 页面预览共用的提醒模板缓存。
 * 管理员保存时主动失效；1 小时 revalidate 是外部直改数据库时的兜底。
 */
export const getCachedReminderTemplate = unstable_cache(
  async () => {
    const setting = await prisma.setting.findUnique({
      where: { key: "reminder_template" },
      select: { value: true },
    });
    return setting?.value || DEFAULT_TEMPLATE;
  },
  ["reminder-template-v1"],
  { revalidate: 3600, tags: [REMINDER_TEMPLATE_TAG] }
);

export function invalidateReminderTemplateCache() {
  revalidateTag(REMINDER_TEMPLATE_TAG, { expire: 0 });
}

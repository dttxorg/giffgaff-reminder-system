import { prisma } from "@/lib/db";
import { DEFAULT_TEMPLATE, portUrl, renderTemplate } from "@/lib/template";
import { formatPhoneForDisplay } from "@/lib/phone";
import { PushPreviewCopyButton } from "./push-preview-copy-button";

interface PushPreviewProps {
  /** 完整手机号(用于预览 phone 变量) */
  phoneNumber: string;
  /** 当前 day_offset(用于预览 days 变量) */
  days: number;
  /** portToken(用于构造 port_url,虽然预览不一定有,fallback 到 PUBLIC_BASE_URL) */
  portToken: string | null;
  /** 预览用 sim id,fallback */
  simIdFallback: number;
}

/**
 * 推送样例预览(server component)
 *
 * 用样例数据渲染当前模板,让用户看到自己实际会收到什么内容。
 *
 * 实际推送时手机号会带后 4 位 mask,但预览显示完整,让用户知道准确内容。
 */
export async function PushPreview({
  phoneNumber,
  days,
  portToken,
  simIdFallback,
}: PushPreviewProps) {
  // 拉当前模板(没有就用默认)
  const setting = await prisma.setting.findUnique({
    where: { key: "reminder_template" },
  });
  const template = setting?.value || DEFAULT_TEMPLATE;

  // 检测未知变量
  const known = new Set(["phone", "days", "port_url"]);
  const matches = template.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) ?? [];
  const unknown = new Set<string>();
  for (const m of matches) {
    const name = m.replace(/[{}\s]/g, "");
    if (!known.has(name)) unknown.add(name);
  }

  // 构造预览用 URL — 用 portToken 优先,fallback 到 id(并标注"此 URL 是示例")
  const baseUrl =
    process.env.PUBLIC_BASE_URL || "https://example.com";
  const url =
    portToken !== null
      ? portUrl(baseUrl, portToken)
      : `${baseUrl}/p/${simIdFallback}`;
  const isSampleUrl = portToken === null;

  const phoneDisplay = formatPhoneForDisplay(phoneNumber);
  const body = renderTemplate(template, {
    phone: phoneDisplay,
    days,
    port_url: url,
  });

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* 推送预览头部 */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">推送样例预览</span>
        <PushPreviewCopyButton body={body} />
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">推送标题</div>
          <div className="text-sm font-medium text-slate-900">
            Giffgaff 保号提醒
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">推送正文</div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 break-words bg-white border border-slate-100 rounded p-3">
            {body}
          </pre>
        </div>
        {isSampleUrl && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠ 此 sim 还没有生成 portToken,URL 是示例占位。真实推送到达时 URL 会不同。
          </div>
        )}
        {unknown.size > 0 && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
            当前模板里有未识别的变量:
            {Array.from(unknown).map((v) => `{{${v}}}`).join(", ")}。这些会原样输出,不会替换。
          </div>
        )}
      </div>
    </div>
  );
}

import { portUrl, renderTemplate } from "@/lib/template";
import { getCachedReminderTemplate } from "@/lib/reminder-template-cache";
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
  /** 父组件已经加载模板时直接传入，避免重复数据库查询 */
  templateOverride?: string;
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
  templateOverride,
}: PushPreviewProps) {
  // 父组件可把模板与其它查询并行预载；独立使用时仍保持原有 fallback。
  const template =
    templateOverride ?? (await getCachedReminderTemplate());

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
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 inline-flex items-start gap-1.5">
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 mt-0.5"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>此 sim 还没有生成 portToken,URL 是示例占位。真实推送到达时 URL 会不同。</span>
            </div>
        )}
        {unknown.size > 0 && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
            当前模板里有未识别的变量:
            {Array.from(unknown).map((v) => `{{${v}}}`).join(", ")}。这些会原样输出,不会替换。
          </div>
        )}
        {/* Round 178: 变量说明 legend (帮助用户理解每个变量的含义) */}
        <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
          <div className="font-medium text-slate-600 mb-1.5">变量说明</div>
          <ul className="space-y-1">
            <li>
              <code className="bg-slate-100 px-1 rounded text-rose-700 font-mono">{"{{phone}}"}</code>
              <span className="ml-1.5">完整手机号(如 07724 215611)</span>
            </li>
            <li>
              <code className="bg-slate-100 px-1 rounded text-rose-700 font-mono">{"{{days}}"}</code>
              <span className="ml-1.5">当前 day offset(距激活日的天数)</span>
            </li>
            <li>
              <code className="bg-slate-100 px-1 rounded text-rose-700 font-mono">{"{{port_url}}"}</code>
              <span className="ml-1.5">保号页 URL(/p/{"<token>"})</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// 提醒文案模板渲染

export const DEFAULT_TEMPLATE = `【{{carrier}} 保号提醒】您的号码 {{phone}} 已激活 {{days}} 天，该保号啦！
点击更新保号时间：{{port_url}}`;

/**
 * 替换模板变量
 * 支持的变量：
 *   {{phone}} - 完整手机号
 *   {{days}} - 当前 day_offset
 *   {{port_url}} - 保号更新链接
 *   {{carrier}} - 运营商展示名称
 */
export function renderTemplate(
  template: string,
  vars: { phone: string; days: number; port_url: string; carrier?: string }
): string {
  const carrier = vars.carrier ?? "Giffgaff";
  // 兼容数据库里保存的旧默认模板：CTExcel 提醒不会继续显示 Giffgaff。
  const compatibleTemplate =
    carrier === "Giffgaff"
      ? template
      : template.replace(/Giffgaff/gi, carrier);
  return compatibleTemplate
    .replace(/\{\{phone\}\}/g, vars.phone)
    .replace(/\{\{days\}\}/g, String(vars.days))
    .replace(/\{\{port_url\}\}/g, vars.port_url)
    .replace(/\{\{carrier\}\}/g, carrier);
}

/**
 * 构造保号页完整 URL
 *
 * @param baseUrl 站点基础 URL
 * @param portToken 仅接受不可枚举的公开 token。
 */
export function portUrl(baseUrl: string, portToken: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/p/${portToken}`;
}

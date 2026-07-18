// 提醒文案模板渲染

export const DEFAULT_TEMPLATE = `【Giffgaff 保号提醒】您的号码 {{phone}} 已激活 {{days}} 天，该保号啦！
点击更新保号时间：{{port_url}}`;

/**
 * 替换模板变量
 * 支持的变量：
 *   {{phone}} - 完整手机号
 *   {{days}} - 当前 day_offset
 *   {{port_url}} - 保号更新链接
 */
export function renderTemplate(
  template: string,
  vars: { phone: string; days: number; port_url: string }
): string {
  return template
    .replace(/\{\{phone\}\}/g, vars.phone)
    .replace(/\{\{days\}\}/g, String(vars.days))
    .replace(/\{\{port_url\}\}/g, vars.port_url);
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

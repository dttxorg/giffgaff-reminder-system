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
 * @param portTokenOrId 优先传 portToken(不可枚举的安全版本);
 *                     兼容旧调用,如果传 number 会用 int id(已弃用,会在控制台 warn)。
 */
export function portUrl(baseUrl: string, portTokenOrId: string | number): string {
  const base = baseUrl.replace(/\/+$/, "");
  // 强类型警告:开发者还在传 int id(老的可枚举形式)
  if (typeof portTokenOrId === "number") {
    console.warn(
      "[portUrl] 传 number 仍然能工作但会生成可枚举 URL,请改用 portToken(字符串)"
    );
  }
  return `${base}/p/${portTokenOrId}`;
}

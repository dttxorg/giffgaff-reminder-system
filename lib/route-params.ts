/** 严格解析动态路由里的正整数 ID，拒绝 `12abc` 等前缀匹配。 */
export function parsePositiveIntParam(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

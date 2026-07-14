/**
 * SIM 卡搜索过滤(纯函数,易测)
 *
 * 匹配规则(任一命中即匹配):
 *  - 查询等于某张卡 phoneNumber.slice(-N) 的后 N 位(N = 查询长度)
 *  - 查询是 phoneNumber 的子串
 *  - 查询去除空格/横线后,跟号码去除空格/横线后是子串关系
 *  - 忽略大小写
 */
export interface SimSearchItem {
  phoneNumber: string;
}

export function filterSimsByQuery<T extends SimSearchItem>(
  sims: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase().replace(/[\s-]/g, "");
  if (!q) return sims;
  return sims.filter((s) => {
    const normalized = s.phoneNumber.toLowerCase().replace(/[\s-]/g, "");
    if (normalized.includes(q)) return true;
    // 也支持后 N 位匹配:用户只输后 4 位时,匹配所有末尾相同的卡
    if (q.length <= normalized.length && normalized.slice(-q.length) === q) {
      return true;
    }
    return false;
  });
}

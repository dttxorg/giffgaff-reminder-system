// SIM portToken - DB 相关操作
//
// 与 lib/port-token.ts 分开,是因为纯工具部分需要在测试里无 DB 加载。
// 这里的所有函数都需要 prisma,调用方应有 DB 可用。

import { prisma } from "./db";
import { generatePortToken, looksLikeToken } from "./port-token";

export { generatePortToken, looksLikeToken };

/**
 * 仅按不可枚举 token 查找公开 SIM。自增数字 ID 不再是公开凭据。
 */
export async function findSimByParam(param: string) {
  const select = {
    id: true,
    phoneNumber: true,
    activatedAt: true,
    lastPortedAt: true,
    portToken: true,
  } as const;
  if (!looksLikeToken(param)) return null;
  return prisma.sim.findUnique({ where: { portToken: param }, select });
}

/**
 * 确保 sim 有 portToken,有则返回,无则生成并持久化后返回。
 *
 * 用于 lazy-backfill 旧 sim:
 * - cron reminder 触达旧 sim 时调用
 * - 旧 URL(/p/${id})被访问时调用
 *
 * 冲突处理: 极小概率生成重复 token,DB 唯一约束会抛错,重试。
 */
export async function ensureSimPortToken(
  simId: number,
  /** 调用方已读取过当前值时传入；undefined 才需要再次查询。 */
  currentPortToken?: string | null
): Promise<string | null> {
  if (currentPortToken !== undefined) {
    if (currentPortToken) return currentPortToken;
  } else {
    const sim = await prisma.sim.findUnique({
      where: { id: simId },
      select: { portToken: true },
    });
    if (!sim) return null;
    if (sim.portToken) return sim.portToken;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generatePortToken();
    try {
      const updated = await prisma.sim.update({
        where: { id: simId },
        data: { portToken: token },
        select: { portToken: true },
      });
      return updated.portToken;
    } catch {
      // 唯一冲突 → 重试生成
      if (attempt === 2) throw new Error("无法生成唯一 portToken");
    }
  }
  return null;
}

import { prisma } from "./db";
import { Prisma } from "./generated/prisma/client";
import { looksLikeToken } from "./port-token";
import { generatePortToken } from "./port-token";

interface PublicPortWriteRow {
  found: boolean;
  simId: number | null;
  portToken: string | null;
  previousPortToken: string | null;
}

export interface PublicPortWriteOutcome {
  found: boolean;
  sim: { id: number; portToken: string | null } | null;
  previousPortToken: string | null;
}

/**
 * 一次数据库调用完成公开参数定位、激活日期下限校验与保号日期更新。
 * found=true 但 sim=null 表示日期早于激活日期。
 */
export async function updatePublicSimPortDate(
  param: string,
  portedAt: Date
): Promise<PublicPortWriteOutcome> {
  if (!looksLikeToken(param)) {
    return { found: false, sim: null, previousPortToken: null };
  }
  const nextPortToken = generatePortToken();
  const targetFilter = Prisma.sql`"portToken" = ${param}`;

  const [row] = await prisma.$queryRaw<PublicPortWriteRow[]>`
    WITH target AS (
      SELECT "id", "activatedAt", "portToken"
      FROM "Sim"
      WHERE ${targetFilter}
      LIMIT 1
    ),
    updated AS (
      UPDATE "Sim" sim
      SET
        "lastPortedAt" = ${portedAt},
        "portToken" = ${nextPortToken},
        "updatedAt" = CURRENT_TIMESTAMP
      FROM target
      WHERE sim."id" = target."id"
        AND ${portedAt}::timestamp::date >= target."activatedAt"::date
      RETURNING sim."id", sim."portToken"
    )
    SELECT
      EXISTS(SELECT 1 FROM target) AS "found",
      (SELECT "id" FROM updated) AS "simId",
      (SELECT "portToken" FROM updated) AS "portToken",
      (SELECT "portToken" FROM target) AS "previousPortToken"
  `;

  if (!row) return { found: false, sim: null, previousPortToken: null };
  return {
    found: row.found,
    sim:
      row.simId === null
        ? null
        : { id: row.simId, portToken: row.portToken },
    previousPortToken: row.previousPortToken,
  };
}

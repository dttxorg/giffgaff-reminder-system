import { prisma } from "./db";
import { Prisma } from "./generated/prisma/client";
import { looksLikeToken } from "./port-token";

interface PublicPortWriteRow {
  found: boolean;
  simId: number | null;
  portToken: string | null;
}

export interface PublicPortWriteOutcome {
  found: boolean;
  sim: { id: number; portToken: string | null } | null;
}

/**
 * 一次数据库调用完成公开参数定位、激活日期下限校验与保号日期更新。
 * found=true 但 sim=null 表示日期早于激活日期。
 */
export async function updatePublicSimPortDate(
  param: string,
  portedAt: Date
): Promise<PublicPortWriteOutcome> {
  let targetFilter: Prisma.Sql;
  if (looksLikeToken(param)) {
    targetFilter = Prisma.sql`"portToken" = ${param}`;
  } else {
    const id = parseInt(param, 10);
    if (!Number.isFinite(id) || id <= 0) return { found: false, sim: null };
    targetFilter = Prisma.sql`"id" = ${id}`;
  }

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
        "updatedAt" = CURRENT_TIMESTAMP
      FROM target
      WHERE sim."id" = target."id"
        AND ${portedAt}::timestamp::date >= target."activatedAt"::date
      RETURNING sim."id", sim."portToken"
    )
    SELECT
      EXISTS(SELECT 1 FROM target) AS "found",
      (SELECT "id" FROM updated) AS "simId",
      (SELECT "portToken" FROM updated) AS "portToken"
  `;

  if (!row) return { found: false, sim: null };
  return {
    found: row.found,
    sim:
      row.simId === null
        ? null
        : { id: row.simId, portToken: row.portToken },
  };
}

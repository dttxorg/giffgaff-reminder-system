import { prisma } from "./db";

type Channel = "serverchan" | "bark" | "pushplus" | "telegram";

interface CurrentUserSimWriteRow {
  authenticated: boolean;
  hasSims: boolean;
  simId: number | null;
  portToken: string | null;
}

export interface CurrentUserSimWriteOutcome {
  authenticated: boolean;
  hasSims: boolean;
  sim: { id: number; portToken: string | null } | null;
}

const UNAUTHENTICATED: CurrentUserSimWriteOutcome = {
  authenticated: false,
  hasSims: false,
  sim: null,
};

function writeOutcome(
  row: CurrentUserSimWriteRow | undefined
): CurrentUserSimWriteOutcome {
  if (!row) return UNAUTHENTICATED;
  return {
    authenticated: row.authenticated,
    hasSims: row.hasSims,
    sim:
      row.simId === null
        ? null
        : { id: row.simId, portToken: row.portToken },
  };
}

/** Session 校验、SIM 归属校验和激活日期更新合并为一次数据库调用。 */
export async function updateCurrentUserSimActivatedAt(
  sessionId: string,
  simId: number,
  activatedAt: Date
): Promise<CurrentUserSimWriteOutcome> {
  const [row] = await prisma.$queryRaw<CurrentUserSimWriteRow[]>`
    WITH expired_session AS (
      DELETE FROM "UserSession"
      WHERE "id" = ${sessionId}
        AND "expiresAt" < CURRENT_TIMESTAMP
      RETURNING "id"
    ),
    current_session AS (
      SELECT "userId"
      FROM "UserSession"
      WHERE "id" = ${sessionId}
        AND "expiresAt" >= CURRENT_TIMESTAMP
    ),
    updated AS (
      UPDATE "Sim" sim
      SET
        "activatedAt" = ${activatedAt},
        "updatedAt" = CURRENT_TIMESTAMP
      FROM current_session current
      WHERE sim."id" = ${simId}
        AND sim."userId" = current."userId"
      RETURNING sim."id", sim."portToken"
    )
    SELECT
      EXISTS(SELECT 1 FROM current_session) AS "authenticated",
      EXISTS(
        SELECT 1
        FROM "Sim" sim
        INNER JOIN current_session current
          ON current."userId" = sim."userId"
      ) AS "hasSims",
      (SELECT "id" FROM updated) AS "simId",
      (SELECT "portToken" FROM updated) AS "portToken"
  `;
  return writeOutcome(row);
}

/** Session 校验、SIM 归属校验和渠道更新合并为一次数据库调用。 */
export async function updateCurrentUserSimChannel(
  sessionId: string,
  simId: number,
  channel: Channel,
  channelKey: string
): Promise<CurrentUserSimWriteOutcome> {
  const [row] = await prisma.$queryRaw<CurrentUserSimWriteRow[]>`
    WITH expired_session AS (
      DELETE FROM "UserSession"
      WHERE "id" = ${sessionId}
        AND "expiresAt" < CURRENT_TIMESTAMP
      RETURNING "id"
    ),
    current_session AS (
      SELECT "userId"
      FROM "UserSession"
      WHERE "id" = ${sessionId}
        AND "expiresAt" >= CURRENT_TIMESTAMP
    ),
    updated AS (
      UPDATE "Sim" sim
      SET
        "channel" = ${channel}::"Channel",
        "channelKey" = ${channelKey},
        "updatedAt" = CURRENT_TIMESTAMP
      FROM current_session current
      WHERE sim."id" = ${simId}
        AND sim."userId" = current."userId"
      RETURNING sim."id", sim."portToken"
    )
    SELECT
      EXISTS(SELECT 1 FROM current_session) AS "authenticated",
      EXISTS(
        SELECT 1
        FROM "Sim" sim
        INNER JOIN current_session current
          ON current."userId" = sim."userId"
      ) AS "hasSims",
      (SELECT "id" FROM updated) AS "simId",
      (SELECT "portToken" FROM updated) AS "portToken"
  `;
  return writeOutcome(row);
}

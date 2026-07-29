import { prisma } from "./db";

type Channel = "serverchan" | "bark" | "pushplus" | "telegram";
type Carrier = "giffgaff" | "ctexcel";

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
  return updateCurrentUserSimDetails(sessionId, simId, { activatedAt });
}

/** Session/归属校验后原子更新运营商与可选激活日期。 */
export async function updateCurrentUserSimDetails(
  sessionId: string,
  simId: number,
  input: {
    activatedAt?: Date;
    carrier?: Carrier;
    reminderStartDay?: number;
    cycleDays?: number;
  }
): Promise<CurrentUserSimWriteOutcome> {
  const activatedAt = input.activatedAt ?? null;
  const carrier = input.carrier ?? null;
  const reminderStartDay = input.reminderStartDay ?? null;
  const cycleDays = input.cycleDays ?? null;
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
        "activatedAt" = COALESCE(${activatedAt}, sim."activatedAt"),
        "carrier" = COALESCE(${carrier}::"Carrier", sim."carrier"),
        "reminderStartDay" = COALESCE(${reminderStartDay}, sim."reminderStartDay"),
        "cycleDays" = COALESCE(${cycleDays}, sim."cycleDays"),
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
    ),
    saved_default AS (
      UPDATE "User" usr
      SET
        "defaultChannel" = ${channel}::"Channel",
        "defaultChannelKey" = ${channelKey},
        "updatedAt" = CURRENT_TIMESTAMP
      FROM current_session current
      WHERE usr."id" = current."userId"
        AND EXISTS(SELECT 1 FROM updated)
      RETURNING usr."id"
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

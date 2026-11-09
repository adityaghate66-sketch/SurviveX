import { AppError } from "../errors/AppError.js";
import { getPrisma, isDatabaseConfigured } from "../config/database.js";
import {
  ZONE_IDS,
  calculateProgress,
  isZoneId,
  normalizeZoneIds,
} from "../constants/zones.js";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const MAX_ID_LENGTH = 128;

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new AppError("DATABASE_URL is not set. Add it to server/.env.", {
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
    });
  }
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertId(value, field) {
  const id = asText(value);
  if (!id || id.length > MAX_ID_LENGTH) {
    throw new AppError(`${field} must be a non-empty string.`, {
      statusCode: 400,
      code: "INVALID_INPUT",
      details: { field },
    });
  }
  return id;
}

function sessionNotFound(sessionId) {
  return new AppError(`Session not found: ${sessionId}`, {
    statusCode: 404,
    code: "SESSION_NOT_FOUND",
  });
}

// Public shape of a session + its progress. Progress is recomputed from the
// stored zone list so an old/stale integer in the database can never be shown.
function presentSession(session) {
  const visitedZones = normalizeZoneIds(session.progress?.visitedZones);

  return {
    sessionId: session.id,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    mission: session.mission
      ? {
          id: session.mission.id,
          code: session.mission.code,
          title: session.mission.title,
        }
      : undefined,
    progress: calculateProgress(visitedZones),
    visitedZones,
    updatedAt: session.progress?.updatedAt ?? session.startedAt,
  };
}

/**
 * POST /api/sessions
 *
 * Finds the player's ACTIVE session for this mission or creates one. Accepts
 * either a real `userId` or a stable `username` (the browser generates one),
 * and locates the mission by `missionId` or `missionCode` / `code`.
 */
export async function createOrGetSession(rawPayload) {
  requireDb();
  const payload = asObject(rawPayload);

  const providedUserId = asText(payload.userId);
  const providedUsername = asText(payload.username);
  const missionId = asText(payload.missionId);
  const missionCode = asText(payload.missionCode ?? payload.code);

  if (!missionId && !missionCode) {
    throw new AppError("missionId or missionCode is required.", {
      statusCode: 400,
      code: "MISSION_REQUIRED",
    });
  }

  const prisma = getPrisma();

  const missionConditions = [];
  if (missionId) missionConditions.push({ id: missionId });
  if (missionCode) missionConditions.push({ code: missionCode });

  const mission = await prisma.mission.findFirst({
    where: { OR: missionConditions, status: "ACTIVE" },
  });

  if (!mission) {
    throw new AppError(
      `Mission not found: ${missionId || missionCode}`,
      {
        statusCode: 404,
        code: "MISSION_NOT_FOUND",
      }
    );
  }

  // Resolve the player. A caller with an existing user ID is trusted only
  // after the row is confirmed; otherwise a username is resolved inside the
  // transaction below, which also covers local play without a login flow.
  let knownUserId = null;
  let username = null;

  if (providedUserId) {
    const user = await prisma.user.findUnique({ where: { id: providedUserId } });
    if (!user) {
      throw new AppError(`User not found: ${providedUserId}`, {
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    }
    knownUserId = user.id;
  } else {
    username = providedUsername || "guest";
    if (!USERNAME_PATTERN.test(username)) {
      throw new AppError(
        "username must be 3-32 characters: letters, numbers, underscore or hyphen.",
        {
          statusCode: 400,
          code: "INVALID_USERNAME",
          details: { field: "username" },
        }
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Two requests can arrive together (React StrictMode mounts effects twice,
    // or two tabs open at once). Transaction-scoped advisory locks make both
    // check-then-create sequences serial: the second request waits, then sees
    // the first user/session instead of inserting a duplicate.
    let userId = knownUserId;
    if (!userId) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`survivex-user:${username}`}, 0))::text`;

      const user = await tx.user.upsert({
        where: { username },
        update: {},
        create: { username },
      });
      userId = user.id;
    }

    const lockKey = `survivex-session:${userId}:${mission.id}`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text`;

    const existing = await tx.gameSession.findFirst({
      where: { userId, missionId: mission.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      include: { progress: true, mission: true },
    });

    if (existing) {
      if (existing.progress) {
        return { session: existing, reused: true };
      }

      // Legacy/partial session without a progress row: fill the gap.
      const progress = await tx.missionProgress.create({
        data: { sessionId: existing.id, progress: 0, visitedZones: [] },
      });

      return {
        session: { ...existing, progress },
        reused: true,
      };
    }

    const created = await tx.gameSession.create({
      data: {
        userId,
        missionId: mission.id,
        progress: {
          create: { progress: 0, visitedZones: [] },
        },
      },
      include: { progress: true, mission: true },
    });

    return { session: created, reused: false };
  });

  return {
    ...presentSession(result.session),
    reused: result.reused,
  };
}

/**
 * PUT /api/sessions/:sessionId/progress
 *
 * Validates the zone, adds it to the unique visited set, recomputes progress
 * server-side and saves both fields atomically.
 */
export async function updateMissionProgress(rawSessionId, rawPayload) {
  requireDb();
  const sessionId = assertId(rawSessionId, "sessionId");
  const payload = asObject(rawPayload);
  const zoneId = asText(payload.zoneId);

  if (!isZoneId(zoneId)) {
    throw new AppError(`Unknown zoneId: ${zoneId || "(missing)"}`, {
      statusCode: 400,
      code: "INVALID_ZONE",
      details: { allowedZones: ZONE_IDS },
    });
  }

  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findUnique({
      where: { id: sessionId },
      include: { progress: true },
    });

    if (!session) throw sessionNotFound(sessionId);

    if (session.status === "ABANDONED") {
      throw new AppError("This session is no longer active.", {
        statusCode: 409,
        code: "SESSION_NOT_ACTIVE",
      });
    }

    const visitedZones = normalizeZoneIds(session.progress?.visitedZones);

    // Completed sessions are read-only, but a late duplicate request from the
    // client should still get a useful (idempotent) answer.
    if (session.status === "COMPLETED") {
      return {
        sessionId: session.id,
        status: session.status,
        completedAt: session.completedAt,
        progress: calculateProgress(visitedZones),
        visitedZones,
        updatedAt: session.progress?.updatedAt ?? session.startedAt,
        newlyDiscovered: false,
        completed: true,
      };
    }

    const alreadyDiscovered = visitedZones.includes(zoneId);
    const nextVisitedZones = alreadyDiscovered
      ? visitedZones
      : normalizeZoneIds([...visitedZones, zoneId]);
    const progress = calculateProgress(nextVisitedZones);

    const saved = await tx.missionProgress.upsert({
      where: { sessionId: session.id },
      update: { progress, visitedZones: nextVisitedZones },
      create: {
        sessionId: session.id,
        progress,
        visitedZones: nextVisitedZones,
      },
    });

    return {
      sessionId: session.id,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      progress,
      visitedZones: nextVisitedZones,
      updatedAt: saved.updatedAt,
      newlyDiscovered: !alreadyDiscovered,
      completed: progress >= 100,
    };
  });
}

/**
 * GET /api/sessions/:sessionId/progress
 */
export async function getMissionProgress(rawSessionId) {
  requireDb();
  const sessionId = assertId(rawSessionId, "sessionId");
  const prisma = getPrisma();

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { progress: true },
  });

  if (!session) throw sessionNotFound(sessionId);

  const progress = await prisma.missionProgress.upsert({
    where: { sessionId: session.id },
    update: {},
    create: { sessionId: session.id, progress: 0, visitedZones: [] },
  });

  const visitedZones = normalizeZoneIds(progress.visitedZones);

  return {
    sessionId: session.id,
    status: session.status,
    completedAt: session.completedAt,
    progress: calculateProgress(visitedZones),
    visitedZones,
    updatedAt: progress.updatedAt,
  };
}

/**
 * POST /api/sessions/:sessionId/complete
 *
 * Completion is allowed only when all five zones are present. Calling it again
 * on an already completed session is safe and simply returns the completion.
 */
export async function completeGameSession(rawSessionId) {
  requireDb();
  const sessionId = assertId(rawSessionId, "sessionId");
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findUnique({
      where: { id: sessionId },
      include: { progress: true },
    });

    if (!session) throw sessionNotFound(sessionId);

    if (session.status === "ABANDONED") {
      throw new AppError("This session is no longer active.", {
        statusCode: 409,
        code: "SESSION_NOT_ACTIVE",
      });
    }

    const visitedZones = normalizeZoneIds(session.progress?.visitedZones);
    const progress = calculateProgress(visitedZones);

    if (session.status === "COMPLETED") {
      return {
        sessionId: session.id,
        status: session.status,
        completedAt: session.completedAt,
        progress,
        visitedZones,
        alreadyCompleted: true,
      };
    }

    if (visitedZones.length < ZONE_IDS.length) {
      throw new AppError(
        "All five zones must be discovered before the mission can be completed.",
        {
          statusCode: 409,
          code: "MISSION_INCOMPLETE",
          details: {
            discovered: visitedZones.length,
            required: ZONE_IDS.length,
            remainingZones: ZONE_IDS.filter((id) => !visitedZones.includes(id)),
          },
        }
      );
    }

    await tx.missionProgress.upsert({
      where: { sessionId: session.id },
      update: { progress, visitedZones },
      create: { sessionId: session.id, progress, visitedZones },
    });

    const completedAt = new Date();
    const updated = await tx.gameSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt },
    });

    return {
      sessionId: updated.id,
      status: updated.status,
      completedAt,
      progress,
      visitedZones,
      alreadyCompleted: false,
    };
  });
}

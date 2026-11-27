// Read-only aggregates for the player dashboard.
//
// Every number returned here is derived from GameSession/MissionProgress rows
// that actually exist. There are no seeded or invented statistics, and
// achievements are an empty array until a model for them exists.

import { AppError } from "../errors/AppError.js";
import { getPrisma, isDatabaseConfigured } from "../config/database.js";
import { calculateProgress, normalizeZoneIds } from "../constants/zones.js";

const RECENT_LIMIT = 10;

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new AppError("DATABASE_URL is not set. Add it to server/.env.", {
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
    });
  }
}

/**
 * Builds a summary for exactly one player. The id comes from the verified
 * token (req.user.id), never from the request body or query string.
 */
export async function getPlayerSummary(userId) {
  requireDb();

  if (!userId) {
    throw new AppError("Player id is required.", {
      statusCode: 400,
      code: "INVALID_INPUT",
      details: { field: "id" },
    });
  }

  const prisma = getPrisma();
  const [user, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.gameSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: {
        mission: {
          select: { id: true, code: true, title: true, mode: true },
        },
        progress: {
          select: { visitedZones: true, updatedAt: true },
        },
      },
    }),
  ]);

  if (!user) {
    throw new AppError(`Player not found: ${userId}`, {
      statusCode: 404,
      code: "PLAYER_NOT_FOUND",
    });
  }

  let completedSessions = 0;
  let activeSessions = 0;
  let abandonedSessions = 0;
  let zonesDiscovered = 0;
  const completedMissions = new Set();

  const recentActivity = sessions.map((session) => {
    // Recompute from the stored zone list, matching the session API.
    const zones = normalizeZoneIds(session.progress?.visitedZones);
    zonesDiscovered += zones.length;

    if (session.status === "COMPLETED") {
      completedSessions += 1;
      completedMissions.add(session.missionId);
    } else if (session.status === "ACTIVE") {
      activeSessions += 1;
    } else {
      abandonedSessions += 1;
    }

    return {
      sessionId: session.id,
      status: session.status,
      mission: session.mission,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      updatedAt: session.progress?.updatedAt ?? session.startedAt,
      progress: calculateProgress(zones),
      zonesDiscovered: zones.length,
    };
  });

  return {
    player: user,
    stats: {
      totalSessions: sessions.length,
      completedSessions,
      activeSessions,
      abandonedSessions,
      missionsCompleted: completedMissions.size,
      // A zone can be discovered again in a later session, so this is the
      // total number of discoveries, not a count of distinct zones ever seen.
      zonesDiscovered,
    },
    recentActivity: recentActivity.slice(0, RECENT_LIMIT),
    achievements: [],
  };
}

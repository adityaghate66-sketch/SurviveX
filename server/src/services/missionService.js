import { AppError } from '../errors/AppError.js';
import { getPrisma, isDatabaseConfigured } from '../config/database.js';

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new AppError('DATABASE_URL is not set. Add it to server/.env.', {
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
  }
}

export async function listMissions() {
  requireDb();
  const prisma = getPrisma();
  return prisma.mission.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ order: 'asc' }, { code: 'asc' }],
  });
}

export async function getMissionByIdOrCode(idOrCode) {
  requireDb();
  const prisma = getPrisma();
  const mission = await prisma.mission.findFirst({
    where: {
      OR: [{ id: idOrCode }, { code: idOrCode }],
    },
  });
  if (!mission) {
    throw new AppError(`Mission not found: ${idOrCode}`, {
      statusCode: 404,
      code: 'MISSION_NOT_FOUND',
    });
  }
  return mission;
}

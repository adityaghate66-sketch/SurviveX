import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Cannot seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const mission = await prisma.mission.upsert({
    where: { code: '001' },
    update: {
      title: 'Know Your Surroundings',
      description: 'Explore the classroom before the emergency begins.',
      objective: 'Explore the environment',
      mode: 'TRAINING',
      status: 'ACTIVE',
      order: 1,
    },
    create: {
      code: '001',
      title: 'Know Your Surroundings',
      description: 'Explore the classroom before the emergency begins.',
      objective: 'Explore the environment',
      mode: 'TRAINING',
      status: 'ACTIVE',
      order: 1,
    },
  });

  console.log(`[seed] mission ready: ${mission.code} ${mission.title} (${mission.id})`);
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

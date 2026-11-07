// The one and only Prisma Client instance.
//
// Prisma 7 connects through a driver adapter instead of a URL baked into the
// schema. PrismaPg wraps a node-postgres connection pool and hands Prisma a
// connection; Prisma then translates your JavaScript calls into SQL.
//
// Why a getter instead of `export const prisma = new PrismaClient(...)`?
// Creating a client with no DATABASE_URL would crash the module on import, and
// then /api/health could not report the problem. getPrisma() delays creation
// until something really needs the database.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "./env.js";

let prisma = null;

/** True when DATABASE_URL is present. Does not prove the server is reachable. */
export function isDatabaseConfigured() {
  return Boolean(config.databaseUrl);
}

export function getPrisma() {
  if (!config.databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to server/.env (see server/.env.example)."
    );
  }

  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: config.databaseUrl });
    prisma = new PrismaClient({
      adapter,
      // `warn`/`error` logs are noisy but invaluable while learning; production
      // only keeps errors.
      log: config.isProduction ? ["error"] : ["warn", "error"],
    });
  }

  return prisma;
}

/** Closes the pool so the process can exit cleanly (called on shutdown). */
export async function disconnectDatabase() {
  if (!prisma) return;
  await prisma.$disconnect();
  prisma = null;
}

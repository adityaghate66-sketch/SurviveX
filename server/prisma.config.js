// Prisma CLI configuration (Prisma 7).
//
// Prisma 7 removed `url` from schema.prisma, so the CLI reads the database URL
// from this file instead. It is only used by CLI commands (prisma generate,
// prisma migrate, prisma studio). The running API connects through the driver
// adapter in src/config/database.js.

import "dotenv/config"; // loads server/.env
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: env("DIRECT_URL")
  },
});

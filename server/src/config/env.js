// Reads environment variables once, validates them, and exports a single
// frozen `config` object. Every other file imports config instead of touching
// `process.env` directly, so there is exactly one place that knows about
// environment variables and one place that fails loudly if they are wrong.

import "dotenv/config"; // loads server/.env into process.env

const rawPort = process.env.PORT ?? "4000";
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid PORT environment variable: "${rawPort}"`);
}

const nodeEnv = process.env.NODE_ENV ?? "development";

// CORS_ORIGIN can hold several origins separated by commas, which is handy
// when you add a deployed frontend later.
//
// Browsers send `Origin` as a bare scheme://host with no trailing slash, and the
// cors package compares strings exactly. A value pasted as
// "https://app.vercel.app/" would therefore reject every real browser request,
// so trailing slashes are stripped here instead of relying on typo-free env.
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// The database URL is optional at boot: the API must still start and report
// "degraded" so you can see *why* it is unhealthy instead of a crash loop.
// Commands that genuinely need it (prisma migrate, any model query) fail with
// a clear message instead.
const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;

export const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  port,
  corsOrigins,
  databaseUrl,
});

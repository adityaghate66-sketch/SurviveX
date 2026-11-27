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
const isProduction = nodeEnv === "production";

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

// Auth tokens must never be signed with a known key in production. Local dev
// and the test suite use a fixed fallback so they run without extra setup.
const jwtSecret = process.env.JWT_SECRET?.trim();
if (isProduction && !jwtSecret) {
  throw new Error("JWT_SECRET must be set when NODE_ENV=production.");
}

const rawBcryptRounds = process.env.BCRYPT_ROUNDS ?? "12";
const bcryptRounds = Number(rawBcryptRounds);
if (!Number.isInteger(bcryptRounds) || bcryptRounds < 8 || bcryptRounds > 15) {
  throw new Error(`Invalid BCRYPT_ROUNDS environment variable: "${rawBcryptRounds}"`);
}

// jsonwebtoken accepts ms-style durations; keep the production value from
// failing at the first login attempt by checking it once at boot.
const jwtExpiresIn = process.env.JWT_EXPIRES_IN?.trim() || "7d";
if (!/^\d+(ms|s|m|h|d|w|y)?$/.test(jwtExpiresIn)) {
  throw new Error(`Invalid JWT_EXPIRES_IN environment variable: "${jwtExpiresIn}"`);
}

export const config = Object.freeze({
  nodeEnv,
  isProduction,
  port,
  corsOrigins,
  databaseUrl,
  jwtSecret: jwtSecret || "survivex-development-only-secret",
  jwtExpiresIn,
  bcryptRounds,
});

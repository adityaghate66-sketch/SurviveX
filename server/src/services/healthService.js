// Health checks. A service owns the "how", the controller only shapes a reply.

import { getPrisma, isDatabaseConfigured } from "../config/database.js";

const QUERY_TIMEOUT_MS = 2000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("DATABASE_TIMEOUT")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Human sentences for the codes we actually expect to hit.
//
// Prisma 7 + the pg adapter reports a failed query as P2010 ("raw query
// failed") and puts the real PostgreSQL SQLSTATE inside the message, so the
// lookup below has to consider several shapes. Never include the connection
// string here — passwords must not reach logs or responses.
const CODE_MESSAGES = {
  // PostgreSQL SQLSTATE codes
  "28P01": "Authentication failed: the password for this user in DATABASE_URL is wrong.",
  "28000": "The database user is not allowed to connect with the configured authentication settings.",
  "3D000": "The database named in DATABASE_URL does not exist. Create it with createdb.",
  ECONNREFUSED: "Cannot reach the PostgreSQL server on the configured host and port. Is it running?",
  ENOTFOUND: "The database host in DATABASE_URL could not be resolved.",
  ETIMEDOUT: "The connection to PostgreSQL timed out.",
  // Prisma engine error codes
  P1000: "Authentication failed. Check the user and password in DATABASE_URL.",
  P1001: "Cannot reach the PostgreSQL server. Is it running on the host and port in DATABASE_URL?",
  P1003: "The database named in DATABASE_URL does not exist.",
  P1010: "The database user is not allowed to access this database.",
  P1017: "The server closed the database connection.",
};

// Some driver errors carry a semantic name but no numeric code.
const NAME_MESSAGES = {
  AuthenticationFailed:
    "Authentication failed: check the user and password in DATABASE_URL.",
  DatabaseDoesNotExist: "The database named in DATABASE_URL does not exist.",
  ConnectionRefused: "Cannot reach the PostgreSQL server on the configured port.",
  ConnectionClosed: "The PostgreSQL server closed the connection.",
  SocketTimeout: "The connection to PostgreSQL timed out.",
};

// Walks the error and its `cause`/`meta.driverAdapterError` chain and returns
// the first friendly sentence it can justify, or a generic fallback.
function describeError(error) {
  const codes = new Set();
  const names = new Set();
  const seen = new Set();
  let current = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);

    if (typeof current.code === "string") codes.add(current.code);
    if (typeof current.name === "string") names.add(current.name);

    const driver = current.meta?.driverAdapterError;
    if (driver && typeof driver === "object") {
      if (typeof driver.code === "string") codes.add(driver.code);
      if (typeof driver.name === "string") names.add(driver.name);
      if (typeof driver.cause?.code === "string") codes.add(driver.cause.code);
    }

    // "Raw query failed. Code: `28P01`. Message: ..."
    const sqlState = /Code: `([0-9A-Z]{5})`/.exec(current.message ?? "");
    if (sqlState) codes.add(sqlState[1]);

    current = current.cause;
  }

  for (const code of codes) {
    if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  }
  for (const name of names) {
    if (NAME_MESSAGES[name]) return NAME_MESSAGES[name];
  }

  return "The database connection failed.";
}

/**
 * Runs a single `SELECT 1`, which proves the whole path works: adapter, pool,
 * network, credentials, and database existence — without depending on any table.
 *
 * @returns {Promise<{status: "connected"|"disconnected"|"not_configured",
 *                    latencyMs?: number, message?: string}>}
 */
export async function checkDatabase() {
  if (!isDatabaseConfigured()) {
    return {
      status: "not_configured",
      message: "DATABASE_URL is not set in server/.env.",
    };
  }

  const startedAt = performance.now();

  try {
    const prisma = getPrisma();
    await withTimeout(prisma.$queryRaw`SELECT 1`, QUERY_TIMEOUT_MS);
    return {
      status: "connected",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    // The API is up, its dependency isn't. Log the detail, report the summary.
    // (A health endpoint gets polled, so keep the log to one line.)
    console.error("[health] database check failed:", error.message);

    if (error instanceof Error && error.message === "DATABASE_TIMEOUT") {
      return {
        status: "disconnected",
        message: `The database did not answer within ${QUERY_TIMEOUT_MS} ms.`,
      };
    }

    return {
      status: "disconnected",
      message: describeError(error),
    };
  }
}

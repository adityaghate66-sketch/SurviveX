import { config } from "../config/env.js";
import { checkDatabase } from "../services/healthService.js";

// GET /api/health
// Reports both halves of the stack, so "the API is up" and "the database is
// reachable" are never confused:
//   200 -> everything works
//   503 -> API answered, but the database is missing or unreachable
// The same JSON envelope is used either way.
export async function getHealth(_req, res) {
  const database = await checkDatabase();
  const healthy = database.status === "connected";

  const data = {
    status: healthy ? "ok" : "degraded",
    service: "survivex-api",
    environment: config.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database,
  };

  if (healthy) {
    return res.status(200).json({ success: true, data });
  }

  return res.status(503).json({
    success: false,
    error: {
      code: "DATABASE_UNAVAILABLE",
      message: database.message ?? "The database is not reachable.",
      details: data,
    },
  });
}

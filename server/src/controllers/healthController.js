import { config } from "../config/env.js";

// GET /api/health
// A cheap "is the API alive?" probe used by the frontend, Postman and, later,
// by whatever hosts the app. The database check is added in Stage 3, when
// Prisma is connected.
export function getHealth(_req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "survivex-api",
      environment: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}

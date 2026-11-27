import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { disconnectDatabase } from "./config/database.js";
import { Server, matchMaker } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./multiplayer/gameRoom.js";
import http from "http";

// Colyseus 0.18 installs one CORS listener on the shared HTTP server that runs
// for *every* request (including /api), and by default reflects any Origin.
// In development we accept any localhost origin so the dev server can run on
// any port without editing .env every time. In production we allow the configured
// origins and the methods/headers needed by the API (including PUT/PATCH).
matchMaker.controller.getCorsHeaders = (headers) => {
  const origin = headers.get("origin");
  // Accept localhost and private LAN addresses (for testing on the same WiFi).
  const isLocalOrigin =
    !origin ||
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
      origin
    );
  if (isLocalOrigin) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
  }
  // Production: use the configured CORS origins from the Express app
  const allowed = config.corsOrigins.includes(origin);
  if (!allowed) {
    return {
      "Access-Control-Allow-Origin": "null",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
};

const app = createApp();

// Create HTTP server first
const server = http.createServer(app);

// Create Colyseus server on the same HTTP server.
// Colyseus 0.18 handles matchmaking CORS itself (it echoes the request origin),
// so the `cors` option is no longer needed here.
const gameServer = new Server({ server });

// Register rooms
gameServer.define("game_room", GameRoom);

// Monitoring endpoint (for development)
app.use("/colyseus", monitor());

// Start through gameServer.listen() (not server.listen()): this is what binds
// Colyseus' /matchmake/* routes onto the HTTP server. Requests for any other
// path still fall through to the Express app (/api, /colyseus).
gameServer.listen(config.port, () => {
  console.log(`[survivex-api] listening on http://localhost:${config.port}`);
  console.log(`[survivex-api] environment: ${config.nodeEnv}`);
  console.log(`[survivex-api] allowed origins: ${config.corsOrigins.join(", ")}`);
  console.log(`[survivex-api] Colyseus WebSocket ready`);
});

// nodemon sends SIGUSR2 on restart; Ctrl+C sends SIGINT. Closing the server
// lets in-flight requests finish instead of being cut off.
//
// Two details matter here:
//  - keep-alive connections (curl, browsers) stay open after the response, and
//    server.close() waits for them, so the process would never exit;
//  - a stuck request must not block shutdown forever, hence the 5 s failsafe.
let shuttingDown = false;

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.on(signal, () => {
    if (shuttingDown) return; // second Ctrl+C is ignored, not an error
    shuttingDown = true;

    console.log(`\n[survivex-api] ${signal} received, shutting down.`);

    // Release the PostgreSQL pool once the HTTP server has stopped.
    server.close(async () => {
      await disconnectDatabase().catch((error) =>
        console.error("[survivex-api] failed to close the database pool:", error)
      );
      console.log("[survivex-api] shutdown complete");
      process.exit(0);
    });

    // Drop connections that are idle between requests; that is usually all of
    // them, which lets server.close() finish immediately.
    server.closeIdleConnections();

    setTimeout(() => {
      console.warn("[survivex-api] forcing shutdown after timeout");
      server.closeAllConnections();
      process.exit(1);
    }, 5000).unref();
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `[survivex-api] port ${config.port} is already in use. Stop the other process or change PORT in server/.env.`
    );
  } else {
    console.error("[survivex-api] failed to start:", error);
  }
  process.exit(1);
});
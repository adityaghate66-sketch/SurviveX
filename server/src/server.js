import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { disconnectDatabase } from "./config/database.js";

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[survivex-api] listening on http://localhost:${config.port}`);
  console.log(`[survivex-api] environment: ${config.nodeEnv}`);
  console.log(`[survivex-api] allowed origins: ${config.corsOrigins.join(", ")}`);
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

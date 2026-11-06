import { createApp } from "./app.js";
import { config } from "./config/env.js";

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[survivex-api] listening on http://localhost:${config.port}`);
  console.log(`[survivex-api] environment: ${config.nodeEnv}`);
  console.log(`[survivex-api] allowed origins: ${config.corsOrigins.join(", ")}`);
});

// nodemon sends SIGUSR2 on restart; Ctrl+C sends SIGINT. Closing the server
// lets in-flight requests finish instead of being cut off.
for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.on(signal, () => {
    console.log(`\n[survivex-api] ${signal} received, shutting down.`);
    server.close(() => process.exit(0));
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
